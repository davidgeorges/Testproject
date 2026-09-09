using System.Security.Claims;
using System.Security.Cryptography.X509Certificates;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace SubscriptionApp.Api;

public sealed class FirebaseAuthenticationOptions : AuthenticationSchemeOptions
{
    public string ProjectId { get; set; } = "";
}

public interface IFirebaseSigningKeys
{
    Task<IReadOnlyList<SecurityKey>> Get(CancellationToken ct);
}

public sealed class FirebaseSigningKeys(IHttpClientFactory clients, TimeProvider time)
    : IFirebaseSigningKeys
{
    private readonly SemaphoreSlim gate = new(1, 1);
    private IReadOnlyList<SecurityKey> cached = [];
    private DateTimeOffset expiresAt;

    public async Task<IReadOnlyList<SecurityKey>> Get(CancellationToken ct)
    {
        if (cached.Count > 0 && expiresAt > time.GetUtcNow()) return cached;
        await gate.WaitAsync(ct);
        try
        {
            if (cached.Count > 0 && expiresAt > time.GetUtcNow()) return cached;
            using var response = await clients.CreateClient("firebase-keys").GetAsync(
                "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com",
                ct
            );
            response.EnsureSuccessStatusCode();
            var certificates = await response.Content.ReadFromJsonAsync<Dictionary<string, string>>(
                cancellationToken: ct
            ) ?? [];
            cached = certificates
                .Select(item =>
                {
                    var certificate = X509Certificate2.CreateFromPem(item.Value);
                    return (SecurityKey)new X509SecurityKey(certificate) { KeyId = item.Key };
                })
                .ToArray();
            if (cached.Count == 0) throw new InvalidOperationException("Firebase returned no signing key.");
            expiresAt = time.GetUtcNow().Add(
                response.Headers.CacheControl?.MaxAge ?? TimeSpan.FromHours(1)
            );
            return cached;
        }
        finally
        {
            gate.Release();
        }
    }
}

public sealed class FirebaseAuthentication(
    IOptionsMonitor<FirebaseAuthenticationOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IFirebaseSigningKeys signingKeys,
    TimeProvider time
) : AuthenticationHandler<FirebaseAuthenticationOptions>(options, logger, encoder)
{
    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var header = Request.Headers.Authorization.ToString();
        if (!header.StartsWith("Bearer ", StringComparison.Ordinal))
            return AuthenticateResult.NoResult();
        var token = header[7..];
        try
        {
            var parsed = new JsonWebToken(token);
            if (parsed.Alg != SecurityAlgorithms.RsaSha256)
                return AuthenticateResult.Fail("Firebase token algorithm is invalid.");
            var validation = await new JsonWebTokenHandler().ValidateTokenAsync(
                token,
                new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKeys = await signingKeys.Get(Context.RequestAborted),
                    ValidateIssuer = true,
                    ValidIssuer = $"https://securetoken.google.com/{Options.ProjectId}",
                    ValidateAudience = true,
                    ValidAudience = Options.ProjectId,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromMinutes(2),
                    NameClaimType = "sub",
                }
            );
            if (!validation.IsValid || validation.ClaimsIdentity is null)
                return AuthenticateResult.Fail("Firebase token validation failed.");
            var subject = validation.ClaimsIdentity.FindFirst("sub")?.Value;
            var authTime = validation.ClaimsIdentity.FindFirst("auth_time")?.Value;
            if (
                string.IsNullOrWhiteSpace(subject)
                || !long.TryParse(authTime, out var authSeconds)
                || DateTimeOffset.FromUnixTimeSeconds(authSeconds) > time.GetUtcNow()
            )
                return AuthenticateResult.Fail("Firebase token claims are invalid.");
            validation.ClaimsIdentity.AddClaim(new Claim(ClaimTypes.NameIdentifier, subject));
            return AuthenticateResult.Success(
                new AuthenticationTicket(
                    new ClaimsPrincipal(validation.ClaimsIdentity),
                    Scheme.Name
                )
            );
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            Logger.LogWarning("Firebase authentication failed with {ErrorType}", exception.GetType().Name);
            return AuthenticateResult.Fail("Firebase token validation failed.");
        }
    }
}
