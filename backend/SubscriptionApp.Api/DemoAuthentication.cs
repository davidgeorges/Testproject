using System.Collections.Concurrent;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace SubscriptionApp.Api;

public sealed class DemoSessions
{
    private readonly ConcurrentDictionary<string, (string UserId, DateTimeOffset Expiry)> sessions =
        new();

    public object Create()
    {
        foreach (var old in sessions.Where(s => s.Value.Expiry < DateTimeOffset.UtcNow))
            sessions.TryRemove(old.Key, out _);
        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        var userId = Guid.NewGuid().ToString();
        sessions[token] = (userId, DateTimeOffset.UtcNow.AddHours(8));
        return new
        {
            token,
            userId,
            expiresIn = 28800,
            isDemo = true,
        };
    }

    public string? Resolve(string token) =>
        sessions.TryGetValue(token, out var s) && s.Expiry > DateTimeOffset.UtcNow
            ? s.UserId
            : null;

    public void Revoke(string userId)
    {
        foreach (var item in sessions.Where(s => s.Value.UserId == userId))
            sessions.TryRemove(item.Key, out _);
    }
}

public sealed class DemoAuthentication(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    DemoSessions sessions
) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var header = Request.Headers.Authorization.ToString();
        var userId = header.StartsWith("Bearer ", StringComparison.Ordinal)
            ? sessions.Resolve(header[7..])
            : null;
        if (userId is null)
            return Task.FromResult(AuthenticateResult.NoResult());
        var identity = new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, userId)],
            Scheme.Name
        );
        return Task.FromResult(
            AuthenticateResult.Success(new(new ClaimsPrincipal(identity), Scheme.Name))
        );
    }
}
