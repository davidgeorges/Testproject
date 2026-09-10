using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using SubscriptionApp.Api;
using SubscriptionApp.Application;
using SubscriptionApp.Domain;
using SubscriptionApp.Infrastructure;
using SubscriptionApp.Persistence;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = 64 * 1024);
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
var demo = builder.Configuration.GetValue<bool>("Demo:Enabled");
var firebaseProjectId = builder.Configuration["Firebase:ProjectId"];
if (demo && !builder.Environment.IsDevelopment())
    throw new InvalidOperationException("Demo mode is restricted to Development.");
builder.Services.AddSingleton<DemoSessions>();
var dataProtection = builder.Services.AddDataProtection();
if (demo)
{
    dataProtection.UseEphemeralDataProtectionProvider();
    builder.Services.Configure<Microsoft.AspNetCore.DataProtection.KeyManagement.KeyManagementOptions>(
        o => o.XmlRepository = new EphemeralKeyRepository()
    );
    if (!string.IsNullOrWhiteSpace(firebaseProjectId))
    {
        builder.Services.AddHttpClient("firebase-keys");
        builder.Services.AddSingleton<IFirebaseSigningKeys, FirebaseSigningKeys>();
        builder.Services
            .AddAuthentication("App")
            .AddPolicyScheme("App", "Demo or Firebase", options =>
                options.ForwardDefaultSelector = context =>
                {
                    var value = context.Request.Headers.Authorization.ToString();
                    var token = value.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
                        ? value[7..]
                        : "";
                    return token.Count(c => c == '.') == 2 ? "Firebase" : "Demo";
                })
            .AddScheme<AuthenticationSchemeOptions, DemoAuthentication>("Demo", _ => { })
            .AddScheme<FirebaseAuthenticationOptions, FirebaseAuthentication>(
                "Firebase",
                options => options.ProjectId = firebaseProjectId
            );
    }
    else
    {
        builder.Services
            .AddAuthentication("Demo")
            .AddScheme<AuthenticationSchemeOptions, DemoAuthentication>("Demo", _ => { });
    }
}
else
{
    if (string.IsNullOrWhiteSpace(firebaseProjectId))
        throw new InvalidOperationException("Firebase:ProjectId is required outside demo mode.");
    builder.Services.AddHttpClient("firebase-keys");
    builder.Services.AddSingleton<IFirebaseSigningKeys, FirebaseSigningKeys>();
    builder
        .Services.AddAuthentication("Firebase")
        .AddScheme<FirebaseAuthenticationOptions, FirebaseAuthentication>(
            "Firebase",
            options => options.ProjectId = firebaseProjectId
        );
}
builder.Services.AddAuthorization();
builder.Services.AddMemoryCache();
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 1;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});
var redisConnection = builder.Configuration.GetConnectionString("Redis");
if (string.IsNullOrWhiteSpace(redisConnection)) builder.Services.AddDistributedMemoryCache();
else builder.Services.AddStackExchangeRedisCache(options =>
{
    if (Uri.TryCreate(redisConnection, UriKind.Absolute, out var redisUri)
        && redisUri.Scheme is "redis" or "rediss")
    {
        var credentials = redisUri.UserInfo.Split(':', 2);
        options.ConfigurationOptions = new StackExchange.Redis.ConfigurationOptions
        {
            User = credentials.Length > 0 ? Uri.UnescapeDataString(credentials[0]) : null,
            Password = credentials.Length > 1 ? Uri.UnescapeDataString(credentials[1]) : null,
            Ssl = redisUri.Scheme == "rediss" || redisUri.Host.EndsWith(".upstash.io", StringComparison.OrdinalIgnoreCase),
            AbortOnConnectFail = false,
        };
        options.ConfigurationOptions.EndPoints.Add(redisUri.Host, redisUri.Port > 0 ? redisUri.Port : 6379);
    }
    else options.Configuration = redisConnection;
});
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer<BearerDocumentTransformer>();
    options.AddOperationTransformer<BearerOperationTransformer>();
});
var otlpEndpoint = builder.Configuration["OpenTelemetry:Endpoint"];
var openTelemetry = builder.Services.AddOpenTelemetry().ConfigureResource(r => r.AddService("subscription-api"));
openTelemetry.WithTracing(tracing =>
{
    tracing.AddAspNetCoreInstrumentation().AddHttpClientInstrumentation();
    if (Uri.TryCreate(otlpEndpoint, UriKind.Absolute, out var endpoint)) tracing.AddOtlpExporter(o => o.Endpoint = endpoint);
});
openTelemetry.WithMetrics(metrics =>
{
    metrics.AddAspNetCoreInstrumentation().AddHttpClientInstrumentation().AddMeter(ProductMetrics.MeterName);
    if (Uri.TryCreate(otlpEndpoint, UriKind.Absolute, out var endpoint)) metrics.AddOtlpExporter(o => o.Endpoint = endpoint);
});
var corsOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
    ?? (builder.Environment.IsDevelopment() ? ["http://localhost:8081", "http://127.0.0.1:8081"] : []);
if (!builder.Environment.IsDevelopment() && corsOrigins.Length == 0)
    throw new InvalidOperationException("Cors:Origins must contain at least one origin outside Development.");
builder.Services.AddCors(o =>
    o.AddDefaultPolicy(p =>
        p.WithOrigins(corsOrigins)
            .AllowAnyMethod()
            .AllowAnyHeader()
    )
);
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = 429;
    o.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(c =>
        RateLimitPartition.GetFixedWindowLimiter(
            c.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? c.Connection.RemoteIpAddress?.ToString() ?? "local",
            _ =>
                new()
                {
                    PermitLimit = 120,
                    Window = TimeSpan.FromMinutes(1),
                    QueueLimit = 0,
                }
        )
    );
});
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<IProductMetrics, ProductMetrics>();
builder.Services.AddSingleton(
    new RecurringPaymentEngine(
        builder.Configuration.GetSection("Detection").Get<DetectionOptions>() ?? new()
    )
);
builder.Services.AddSingleton<SavingsEngine>();
builder.Services.AddSingleton<ITransactionNormalizer, TransactionNormalizer>();
var openAiApiKey = builder.Configuration["OpenAI:ApiKey"];
var openAiModel = builder.Configuration["OpenAI:Model"];
if (!string.IsNullOrWhiteSpace(openAiApiKey) && !string.IsNullOrWhiteSpace(openAiModel))
{
    builder.Services.AddHttpClient("openai-explainer", client => client.Timeout = TimeSpan.FromSeconds(10));
    builder.Services.AddSingleton<IRecommendationExplainer>(sp => new OpenAiRecommendationExplainer(
        sp.GetRequiredService<IHttpClientFactory>().CreateClient("openai-explainer"), openAiApiKey, openAiModel,
        sp.GetRequiredService<ILogger<OpenAiRecommendationExplainer>>()));
}
else builder.Services.AddSingleton<IRecommendationExplainer, DeterministicRecommendationExplainer>();
var firebaseServiceAccount = builder.Configuration["Firebase:ServiceAccountJson"];
var firebaseMessagingProject = builder.Configuration["Firebase:MessagingProjectId"] ?? builder.Configuration["Firebase:ProjectId"];
var pushProvider = builder.Configuration["Push:Provider"]?.Trim().ToLowerInvariant();
if (pushProvider == "expo")
{
    builder.Services.AddHttpClient("expo-push", client =>
    {
        client.BaseAddress = new Uri("https://exp.host/");
        client.Timeout = TimeSpan.FromSeconds(15);
    });
    builder.Services.AddSingleton<ExpoPushSender>(sp => new ExpoPushSender(
        sp.GetRequiredService<IHttpClientFactory>().CreateClient("expo-push"),
        builder.Configuration["Push:ExpoAccessToken"]));
    builder.Services.AddSingleton<IPushSender>(sp => sp.GetRequiredService<ExpoPushSender>());
    builder.Services.AddSingleton<IPushReceiptChecker>(sp => sp.GetRequiredService<ExpoPushSender>());
}
else if (!string.IsNullOrWhiteSpace(firebaseServiceAccount) && !string.IsNullOrWhiteSpace(firebaseMessagingProject))
{
    builder.Services.AddHttpClient("firebase-messaging", client => client.Timeout = TimeSpan.FromSeconds(15));
    builder.Services.AddSingleton<IPushSender>(sp => FirebasePushSender.Create(
        sp.GetRequiredService<IHttpClientFactory>().CreateClient("firebase-messaging"),
        firebaseServiceAccount, firebaseMessagingProject));
    builder.Services.AddSingleton<IPushReceiptChecker, UnavailablePushReceiptChecker>();
}
else
{
    builder.Services.AddSingleton<IPushSender, UnavailablePushSender>();
    builder.Services.AddSingleton<IPushReceiptChecker, UnavailablePushReceiptChecker>();
}
if (demo) builder.Services.AddSingleton<IIdentityLifecycle, DemoIdentityLifecycle>();
else if (!string.IsNullOrWhiteSpace(firebaseServiceAccount) && !string.IsNullOrWhiteSpace(firebaseMessagingProject))
{
    builder.Services.AddHttpClient("firebase-identity", client => client.Timeout = TimeSpan.FromSeconds(15));
    builder.Services.AddSingleton<IIdentityLifecycle>(sp => FirebaseIdentityLifecycle.Create(
        sp.GetRequiredService<IHttpClientFactory>().CreateClient("firebase-identity"), firebaseServiceAccount, firebaseMessagingProject));
}
else builder.Services.AddSingleton<IIdentityLifecycle, UnavailableIdentityLifecycle>();
var tinkClientId = builder.Configuration["Tink:ClientId"];
var tinkClientSecret = builder.Configuration["Tink:ClientSecret"];
var tinkRedirectUri = builder.Configuration["Tink:RedirectUri"];
var tinkNativeRedirectUri = builder.Configuration["Tink:NativeRedirectUri"];
static string? TinkLink(string? clientId, string? redirectUri) =>
    !string.IsNullOrWhiteSpace(clientId) && !string.IsNullOrWhiteSpace(redirectUri)
        ? $"https://link.tink.com/1.0/transactions/connect-accounts/?client_id={Uri.EscapeDataString(clientId)}&redirect_uri={Uri.EscapeDataString(redirectUri)}&market=FR&locale=fr_FR"
        : null;
var tinkLinkUrl = builder.Configuration["Tink:LinkUrl"] ??
    TinkLink(tinkClientId, tinkRedirectUri);
var tinkNativeLinkUrl = TinkLink(tinkClientId, tinkNativeRedirectUri);
if (!string.IsNullOrWhiteSpace(tinkClientId) && !string.IsNullOrWhiteSpace(tinkClientSecret) && !string.IsNullOrWhiteSpace(tinkLinkUrl))
{
    builder.Services.AddHttpClient<TinkBankingProvider>(client =>
    {
        client.BaseAddress = new Uri("https://api.tink.com");
        client.Timeout = TimeSpan.FromSeconds(30);
    });
    builder.Services.AddSingleton(new TinkLinkOptions(tinkLinkUrl, tinkNativeLinkUrl));
    builder.Services.AddSingleton<IBankingProvider>(sp => sp.GetRequiredService<TinkBankingProvider>());
}
else if (demo) builder.Services.AddSingleton<IBankingProvider, SandboxBankingProvider>();
else builder.Services.AddSingleton<IBankingProvider, UnavailableBankingProvider>();
var premiumVerificationSecret = builder.Configuration["Premium:VerificationSecret"];
if (demo && (string.IsNullOrWhiteSpace(premiumVerificationSecret) || premiumVerificationSecret.Length < 32))
    throw new InvalidOperationException("Premium:VerificationSecret must contain at least 32 characters.");
var revenueCatSecret = builder.Configuration["RevenueCat:SecretApiKey"];
var revenueCatProductPlans = new Dictionary<string, string>(StringComparer.Ordinal);
foreach (var product in builder.Configuration.GetSection("RevenueCat:Products:Monthly").Get<string[]>() ?? [])
    revenueCatProductPlans[product] = "monthly";
foreach (var product in builder.Configuration.GetSection("RevenueCat:Products:Annual").Get<string[]>() ?? [])
    revenueCatProductPlans[product] = "annual";
if (!string.IsNullOrWhiteSpace(revenueCatSecret))
{
    var revenueCatEntitlement = builder.Configuration["RevenueCat:EntitlementId"] ?? "premium";
    builder.Services.AddHttpClient("RevenueCat", client =>
    {
        client.BaseAddress = new Uri("https://api.revenuecat.com");
        client.Timeout = TimeSpan.FromSeconds(15);
    });
    builder.Services.AddSingleton<IPremiumPurchaseVerifier>(sp => new RevenueCatPurchaseVerifier(
        sp.GetRequiredService<IHttpClientFactory>().CreateClient("RevenueCat"),
        revenueCatSecret,
        revenueCatEntitlement,
        revenueCatProductPlans
    ));
}
else if (demo)
    builder.Services.AddSingleton<IPremiumPurchaseVerifier>(sp =>
        new SandboxPremiumPurchaseVerifier(premiumVerificationSecret!, sp.GetRequiredService<TimeProvider>())
    );
else builder.Services.AddSingleton<IPremiumPurchaseVerifier, UnavailablePremiumPurchaseVerifier>();
if (demo)
    builder.Services.AddSingleton<IPremiumEventVerifier>(new SandboxPremiumEventVerifier(premiumVerificationSecret!));
else builder.Services.AddSingleton<IPremiumEventVerifier, UnavailablePremiumEventVerifier>();
builder.Services.AddScoped<AnalysisService>();
builder.Services.AddScoped<ConsentExpiryProcessor>();
builder.Services.AddScoped<BankSyncProcessor>();
builder.Services.AddScoped<PushDeliveryProcessor>();
builder.Services.AddScoped<PushReceiptProcessor>();
builder.Services.AddHostedService<ConsentExpiryWorker>();
builder.Services.AddHostedService<BankSyncWorker>();
builder.Services.AddHostedService<PushDeliveryWorker>();
builder.Services.AddHostedService<PushReceiptWorker>();
builder.Services.AddHostedService<DataRetentionWorker>();
builder.Services.AddHostedService<AccountDeletionWorker>();
var connectionString = builder.Configuration.GetConnectionString("Postgres");
if (!demo && string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException("ConnectionStrings:Postgres is required outside demo mode.");
if (string.IsNullOrEmpty(connectionString))
{
    builder.Services.AddSingleton<IWorkspaceStore, InMemoryWorkspaceStore>();
    builder.Services.AddSingleton<IOfferCatalog, DemoOfferCatalog>();
    builder.Services.AddSingleton<IIdempotencyStore, InMemoryIdempotencyStore>();
}
else
{
    builder.Services.AddDbContext<WorkspaceDbContext>(o => o.UseNpgsql(connectionString));
    dataProtection.PersistKeysToDbContext<WorkspaceDbContext>();
    builder.Services.AddScoped<IWorkspaceStore, PostgresWorkspaceStore>();
    builder.Services.AddScoped<PostgresOfferCatalog>();
    builder.Services.AddScoped<IOfferCatalog, CachedOfferCatalog>();
    builder.Services.AddScoped<IIdempotencyStore, PostgresIdempotencyStore>();
}
var app = builder.Build();
if (connectionString is not null && builder.Configuration.GetValue("Database:ApplyMigrationsOnStartup", !demo))
{
    await using var migrationScope = app.Services.CreateAsyncScope();
    await migrationScope.ServiceProvider.GetRequiredService<WorkspaceDbContext>().Database.MigrateAsync();
}
app.UseForwardedHeaders();
if (!app.Environment.IsDevelopment()) app.UseHsts();
app.Use(async (ctx, next) =>
{
    if (ctx.Request.Path.Equals("/api/v1/webhooks/revenuecat", StringComparison.OrdinalIgnoreCase))
        ctx.Request.EnableBuffering();
    await next();
});
app.Use(
    async (ctx, next) =>
    {
        ctx.Response.Headers["X-Content-Type-Options"] = "nosniff";
        ctx.Response.Headers["X-Frame-Options"] = "DENY";
        ctx.Response.Headers["Referrer-Policy"] = "no-referrer";
        ctx.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
        ctx.Response.Headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'";
        ctx.Response.Headers["X-Correlation-ID"] = ctx.TraceIdentifier;
        ctx.Response.Headers.CacheControl = "no-store";
        try
        {
            await next();
        }
        catch (OperationCanceledException) when (ctx.RequestAborted.IsCancellationRequested) { }
        catch (Exception ex)
        {
            app.Logger.LogError(
                ex,
                "Request failed {ErrorType}, correlation {CorrelationId}",
                ex.GetType().Name,
                ctx.TraceIdentifier
            );
            if (!ctx.Response.HasStarted)
            {
                ctx.Response.StatusCode = 500;
                await ctx.Response.WriteAsJsonAsync(
                    new
                    {
                        code = "SERVER_ERROR",
                        message = "Le service est momentanément indisponible.",
                        correlationId = ctx.TraceIdentifier,
                    }
                );
            }
        }
    }
);
app.UseCors();
app.UseAuthentication();
app.Use(async (context, next) =>
{
    var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
    var isAccountDeletionRoute = context.Request.Path.Equals("/api/v1/account", StringComparison.OrdinalIgnoreCase)
        || context.Request.Path.Equals("/api/v1/account/deletion", StringComparison.OrdinalIgnoreCase);
    if (!string.IsNullOrWhiteSpace(userId)
        && context.Request.Path.StartsWithSegments("/api/v1")
        && !isAccountDeletionRoute)
    {
        await using var scope = context.RequestServices.CreateAsyncScope();
        var deletion = await scope.ServiceProvider.GetRequiredService<IWorkspaceStore>()
            .AccountDeletion(userId, context.RequestAborted);
        if (deletion is not null)
        {
            context.Response.StatusCode = StatusCodes.Status410Gone;
            await context.Response.WriteAsJsonAsync(new
            {
                code = "ACCOUNT_DELETION_IN_PROGRESS",
                message = "La suppression de ce compte est en cours.",
                correlationId = context.TraceIdentifier,
            }, context.RequestAborted);
            return;
        }
    }
    await next();
});
app.UseRateLimiter();
app.UseAuthorization();
app.UseStatusCodePages(async status =>
{
    var ctx = status.HttpContext;
    await ctx.Response.WriteAsJsonAsync(
        new
        {
            code = $"HTTP_{ctx.Response.StatusCode}",
            message = ctx.Response.StatusCode == 401
                ? "Veuillez vous reconnecter."
                : "La demande n’a pas pu être traitée.",
            correlationId = ctx.TraceIdentifier,
        }
    );
});
app.MapGet(
    "/health",
    () => Results.Ok(new { status = "ok" })
);
app.MapGet("/health/live", () => Results.Ok(new { status = "ok" }));
app.MapGet("/health/ready", async (IServiceScopeFactory scopeFactory, IBankingProvider banking, IIdentityLifecycle identity, IPushSender push, IPremiumPurchaseVerifier purchase, IPremiumEventVerifier premiumEvents, CancellationToken ct) =>
{
    var databaseReady = true;
    if (connectionString is not null)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        databaseReady = await scope.ServiceProvider.GetRequiredService<WorkspaceDbContext>().Database.CanConnectAsync(ct);
    }
    var identityReady = identity.IsConfigured;
    var tinkWebhookReady = banking is not TinkBankingProvider
        || (builder.Configuration["Tink:WebhookAuthorization"]?.Length ?? 0) >= 32;
    var bankingEncryptionReady = banking is not TinkBankingProvider
        || (builder.Configuration["Banking:TokenEncryptionKey"]?.Length ?? 0) >= 32;
    var nativeBankingReady = banking is not TinkBankingProvider
        || !string.IsNullOrWhiteSpace(tinkNativeLinkUrl);
    var premiumProductsReady = demo || revenueCatProductPlans.Count > 0;
    var premiumEventsReady = premiumEvents.IsConfigured
        || ((builder.Configuration["RevenueCat:WebhookAuthorization"]?.Length ?? 0) >= 32
            && (builder.Configuration["RevenueCat:WebhookSigningSecret"]?.Length ?? 0) >= 32);
    var integrationsReady = demo || (banking.IsConfigured && tinkWebhookReady && bankingEncryptionReady
        && nativeBankingReady && identityReady && push.IsConfigured && purchase.IsConfigured
        && premiumProductsReady && premiumEventsReady);
    var ready = databaseReady && integrationsReady;
    return Results.Json(new
    {
        status = ready ? "ready" : "not_ready",
        database = databaseReady,
        banking = banking.IsConfigured,
        bankingWebhook = tinkWebhookReady,
        bankingEncryption = bankingEncryptionReady,
        bankingNative = nativeBankingReady,
        identity = identityReady,
        push = push.IsConfigured,
        premiumPurchase = purchase.IsConfigured,
        premiumProducts = premiumProductsReady,
        premiumEvents = premiumEventsReady
    }, statusCode: ready ? 200 : 503);
});
if (app.Environment.IsDevelopment() || demo) app.MapOpenApi();
if (demo)
    app.MapPost("/api/v1/demo/sessions", (DemoSessions sessions) => Results.Ok(sessions.Create()));
app.MapPost("/api/v1/webhooks/affiliation", async (AffiliateConversionRequest request, HttpContext c, IConfiguration configuration, IWorkspaceStore store, TimeProvider time, CancellationToken ct) =>
{
    var secret = configuration["Affiliation:WebhookSecret"];
    if (string.IsNullOrWhiteSpace(secret) || secret.Length < 32) return Unavailable(c, "AFFILIATION_NOT_CONFIGURED", "Le webhook d’affiliation doit être configuré.");
    var supplied = c.Request.Headers["X-Webhook-Signature"].ToString();
    var timestampText = c.Request.Headers["X-Webhook-Timestamp"].ToString();
    if (!long.TryParse(timestampText, out var timestamp)
        || Math.Abs(time.GetUtcNow().ToUnixTimeSeconds() - timestamp) > 300)
        return Results.Unauthorized();
    var canonical = $"{timestampText}|{request.Provider}|{request.ConversionId}|{request.EventId}|{request.Amount.ToString(System.Globalization.CultureInfo.InvariantCulture)}|{request.Currency.ToUpperInvariant()}";
    var expected = Convert.ToHexString(HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(canonical)));
    if (supplied.Length != expected.Length || !CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(supplied.ToUpperInvariant()), Encoding.ASCII.GetBytes(expected)))
        return Results.Unauthorized();
    if (request.Amount < 0 || request.Provider.Length is < 2 or > 64 || request.ConversionId.Length is < 2 or > 128 || request.Currency.Length != 3)
        return Results.BadRequest(new { code = "INVALID_CONVERSION", message = "La conversion est invalide.", correlationId = c.TraceIdentifier });
    var click = await store.RecommendationEvent(request.EventId, ct);
    if (click is null || click.EventType != "click") return Missing(c);
    var saved = await store.SaveAffiliateConversion(new AffiliateConversion
    {
        UserId = click.UserId,
        RecommendationEventId = click.Id,
        Provider = request.Provider,
        ExternalConversionId = request.ConversionId,
        Amount = request.Amount,
        Currency = request.Currency.ToUpperInvariant(),
    }, ct);
    return saved ? Results.Ok(new { accepted = true }) : Results.Ok(new { accepted = true, duplicate = true });
});
app.MapPost("/api/v1/webhooks/premium", async (PremiumWebhookRequest request, HttpContext c, IPremiumEventVerifier verifier, IWorkspaceStore store, CancellationToken ct) =>
{
    if (!verifier.IsConfigured)
        return Unavailable(c, "PREMIUM_WEBHOOK_NOT_CONFIGURED", "Le webhook Premium doit être configuré.");
    var verified = await verifier.Verify(request.Provider, request.EventId, request.SubscriptionId, request.EventType,
        request.OccurredAt, request.RenewsAt, request.SignedPayload, ct);
    if (verified is null) return Results.Unauthorized();
    var applied = await store.ApplyPremiumEvent(new PremiumWebhookEvent
    {
        Provider = verified.Provider,
        ExternalEventId = verified.EventId,
        ExternalSubscriptionId = verified.SubscriptionId,
        EventType = verified.EventType,
        OccurredAt = verified.OccurredAt,
    }, verified.RenewsAt, ct);
    return Results.Ok(new { accepted = true, duplicateOrStale = !applied });
});
app.MapPost("/api/v1/webhooks/revenuecat", async (RevenueCatWebhookRequest request, HttpContext c, IConfiguration configuration, IWorkspaceStore store, TimeProvider time, CancellationToken ct) =>
{
    var expected = configuration["RevenueCat:WebhookAuthorization"];
    var supplied = c.Request.Headers.Authorization.ToString();
    if (string.IsNullOrWhiteSpace(expected)
        || supplied.Length != expected.Length
        || !CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(supplied), Encoding.UTF8.GetBytes(expected)))
        return Results.Unauthorized();
    var signingSecret = configuration["RevenueCat:WebhookSigningSecret"];
    if (!string.IsNullOrWhiteSpace(signingSecret))
    {
        c.Request.Body.Position = 0;
        using var reader = new StreamReader(c.Request.Body, Encoding.UTF8, leaveOpen: true);
        var rawBody = await reader.ReadToEndAsync(ct);
        c.Request.Body.Position = 0;
        var signature = c.Request.Headers["X-RevenueCat-Webhook-Signature"].ToString();
        var parts = signature.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .Select(part => part.Split('=', 2))
            .Where(part => part.Length == 2)
            .ToDictionary(part => part[0], part => part[1], StringComparer.Ordinal);
        if (!parts.TryGetValue("t", out var timestampText)
            || !long.TryParse(timestampText, out var timestamp)
            || !parts.TryGetValue("v1", out var suppliedSignature)
            || Math.Abs(time.GetUtcNow().ToUnixTimeSeconds() - timestamp) > 300)
            return Results.Unauthorized();
        var expectedSignature = Convert.ToHexString(HMACSHA256.HashData(
            Encoding.UTF8.GetBytes(signingSecret),
            Encoding.UTF8.GetBytes($"{timestampText}.{rawBody}")));
        if (suppliedSignature.Length != expectedSignature.Length
            || !CryptographicOperations.FixedTimeEquals(
                Encoding.ASCII.GetBytes(suppliedSignature.ToUpperInvariant()),
                Encoding.ASCII.GetBytes(expectedSignature)))
            return Results.Unauthorized();
    }
    var source = request.Event;
    var eventType = source.Type.ToUpperInvariant() switch
    {
        "INITIAL_PURCHASE" or "RENEWAL" or "UNCANCELLATION" or "PRODUCT_CHANGE" => "renewed",
        "CANCELLATION" or "SUBSCRIPTION_PAUSED" => "cancelled",
        "BILLING_ISSUE" => "renewed",
        "EXPIRATION" or "REFUND" => "expired",
        _ => null,
    };
    if (eventType is null) return Results.Ok(new { accepted = true, ignored = true });
    var occurredAt = DateTimeOffset.FromUnixTimeMilliseconds(source.EventTimestampMs);
    var renewsAt = source.ExpirationAtMs is { } expiry
        ? DateTimeOffset.FromUnixTimeMilliseconds(expiry)
        : (DateTimeOffset?)null;
    var applied = await store.ApplyPremiumEvent(new PremiumWebhookEvent
    {
        Provider = "revenuecat",
        ExternalEventId = source.Id,
        ExternalSubscriptionId = source.OriginalTransactionId ?? source.TransactionId ?? "",
        EventType = eventType,
        OccurredAt = occurredAt,
    }, renewsAt, ct);
    return Results.Ok(new { accepted = true, duplicateOrStale = !applied });
});
app.MapPost("/api/v1/webhooks/tink", async (HttpContext c, IConfiguration configuration, IWorkspaceStore store, IIdempotencyStore idempotency, TimeProvider time, CancellationToken ct) =>
{
    var expected = configuration["Tink:WebhookAuthorization"];
    if (string.IsNullOrWhiteSpace(expected)) return Results.Unauthorized();
    using var reader = new StreamReader(c.Request.Body, Encoding.UTF8);
    var rawBody = await reader.ReadToEndAsync(ct);
    var supplied = c.Request.Headers.Authorization.ToString();
    var bearerValid = supplied.Length == expected.Length
        && CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(supplied), Encoding.UTF8.GetBytes(expected));
    var signatureValid = false;
    var signature = c.Request.Headers["X-Tink-Signature"].ToString();
    try
    {
        var suppliedSignature = Convert.FromHexString(signature);
        var expectedSignature = HMACSHA256.HashData(Encoding.UTF8.GetBytes(expected), Encoding.UTF8.GetBytes(rawBody));
        signatureValid = suppliedSignature.Length == expectedSignature.Length
            && CryptographicOperations.FixedTimeEquals(suppliedSignature, expectedSignature);
    }
    catch (FormatException) { }
    if (!bearerValid && !signatureValid) return Results.Unauthorized();

    JsonElement root;
    try { root = JsonDocument.Parse(rawBody).RootElement.Clone(); }
    catch (JsonException)
    {
        return Results.BadRequest(new { code = "INVALID_TINK_EVENT", message = "L’événement Tink est invalide.", correlationId = c.TraceIdentifier });
    }
    static string? Text(JsonElement element, params string[] names)
    {
        foreach (var name in names)
            if (element.ValueKind == JsonValueKind.Object && element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String)
                return value.GetString();
        return null;
    }
    var eventType = Text(root, "type", "eventType") ?? "unknown";
    var eventId = Text(root, "eventId", "id") ?? Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawBody)));
    var credentialsId = Text(root, "credentialsId", "credentialId");
    if (string.IsNullOrWhiteSpace(credentialsId) && root.TryGetProperty("data", out var data))
        credentialsId = Text(data, "credentialsId", "credentialId");
    if (string.IsNullOrWhiteSpace(credentialsId) && root.TryGetProperty("content", out var content))
        credentialsId = Text(content, "credentialsId", "credentialId");
    if (eventType.Equals("test", StringComparison.OrdinalIgnoreCase))
        return Results.Ok(new { accepted = true, test = true });
    if (string.IsNullOrWhiteSpace(credentialsId))
        return Results.Ok(new { accepted = true, ignored = true, reason = "credentials_id_missing" });
    var cacheKey = $"tink-webhook:{eventId}";
    var fingerprint = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes($"{credentialsId}|{eventType}")));
    var decision = await idempotency.Begin(cacheKey, fingerprint, time.GetUtcNow().AddDays(7), ct);
    if (decision.State == IdempotencyState.Conflict)
        return Results.Conflict(new { code = "TINK_EVENT_CONFLICT", message = "Cet identifiant d’événement a déjà été utilisé.", correlationId = c.TraceIdentifier });
    if (decision.State is IdempotencyState.Pending or IdempotencyState.Completed)
        return Results.Ok(new { accepted = true, duplicate = true });
    try
    {
        var connection = await store.ConnectionByProviderReference("tink", credentialsId, ct);
        if (connection is null)
        {
            await idempotency.Complete(cacheKey, fingerprint, 200, null, ct);
            return Results.Ok(new { accepted = true, ignored = true });
        }
        var normalizedType = eventType.Trim().Replace('.', '_').Replace('-', '_').ToUpperInvariant();
        if (normalizedType is "AUTHORIZATION_REVOKED" or "CREDENTIALS_INVALID" or "CREDENTIALS_DELETED")
        {
            await store.SetConnectionStatus(connection, "reconnect_required", ct);
            await store.AddNotification(new()
            {
                UserId = connection.UserId,
                Type = "bank_reconnect_required",
                Title = "Reconnectez votre banque",
                Body = "Votre banque demande une nouvelle authentification.",
                ResourceId = connection.Id.ToString(),
                SourceKey = $"tink:{eventId}",
            }, ct);
            await idempotency.Complete(cacheKey, fingerprint, 200, null, ct);
            return Results.Ok(new { accepted = true, reconnectRequired = true });
        }
        var now = time.GetUtcNow();
        var job = await store.EnqueueSync(new BankSyncJob
        {
            UserId = connection.UserId,
            ConnectionId = connection.Id,
            CreatedAt = now,
            UpdatedAt = now,
        }, ct);
        await idempotency.Complete(cacheKey, fingerprint, 202, null, ct);
        return Results.Accepted($"/api/v1/bank/sync-jobs/{job.Id}", new { accepted = true, job.Id });
    }
    catch
    {
        await idempotency.Abandon(cacheKey, fingerprint, ct);
        throw;
    }
});
var api = app.MapGroup("/api/v1").RequireAuthorization();
static string User(HttpContext c) => c.User.FindFirstValue(ClaimTypes.NameIdentifier)!;
static bool IsAdmin(HttpContext c, IConfiguration configuration)
{
    if (!configuration.GetValue<bool>("Demo:Enabled"))
        return c.User.HasClaim("admin", "true") || c.User.IsInRole("admin");
    var expected = configuration["Admin:ApiKey"];
    var provided = c.Request.Headers["X-Admin-Key"].ToString();
    if (string.IsNullOrEmpty(expected) || expected.Length != provided.Length) return false;
    return CryptographicOperations.FixedTimeEquals(
        Encoding.UTF8.GetBytes(expected),
        Encoding.UTF8.GetBytes(provided)
    );
}
static async Task Audit(
    IWorkspaceStore store,
    HttpContext context,
    string action,
    string resourceType,
    string? resourceId,
    CancellationToken ct
)
{
    await store.Profile(User(context), ct);
    await store.AddAudit(
        new()
        {
            UserId = User(context),
            Action = action,
            ResourceType = resourceType,
            ResourceId = resourceId,
        },
        ct
    );
}
static IResult Missing(HttpContext c) =>
    Results.NotFound(
        new
        {
            code = "NOT_FOUND",
            message = "Cet élément est introuvable.",
            correlationId = c.TraceIdentifier,
        }
    );
static IResult Unavailable(HttpContext c, string code, string message) =>
    Results.Json(
        new { code, message, correlationId = c.TraceIdentifier },
        statusCode: StatusCodes.Status503ServiceUnavailable
    );
static BankConnectionResponse SafeBank(BankConnection bank) => new(bank.Id, bank.BankName, bank.Provider, bank.Status, bank.LastSyncAt, bank.ConsentExpiresAt, bank.AuthorizationUrl);
static bool HasRecentAuthentication(HttpContext context, TimeProvider time, bool isDemo)
{
    if (isDemo) return true;
    return long.TryParse(context.User.FindFirstValue("auth_time"), out var seconds)
        && time.GetUtcNow() - DateTimeOffset.FromUnixTimeSeconds(seconds) <= TimeSpan.FromMinutes(10);
}
static bool PremiumActive(PremiumSubscription? premium, TimeProvider time) =>
    premium is not null
    && premium.Status is "active" or "cancelled"
    && premium.RenewsAt > time.GetUtcNow();
static IResult PremiumRequired(HttpContext context) =>
    Results.Json(
        new
        {
            code = "PREMIUM_REQUIRED",
            message = "Cette fonctionnalité est réservée aux membres Premium.",
            correlationId = context.TraceIdentifier,
        },
        statusCode: StatusCodes.Status403Forbidden
    );
api.MapGet(
    "/profile",
    async (HttpContext c, IWorkspaceStore s, CancellationToken ct) =>
        Results.Ok(await s.Profile(User(c), ct))
);
api.MapPatch(
    "/profile",
    async (ProfileRequest request, HttpContext c, IWorkspaceStore s, CancellationToken ct) =>
    {
        if (
            string.IsNullOrWhiteSpace(request.FirstName)
            || request.FirstName.Length > 60
            || request.Theme is not ("dark" or "light")
        )
            return Results.BadRequest(
                new
                {
                    code = "INVALID_PROFILE",
                    message = "Vérifiez le prénom et le thème.",
                    correlationId = c.TraceIdentifier,
                }
            );
        var p = await s.Profile(User(c), ct);
        p.FirstName = request.FirstName.Trim();
        p.Theme = request.Theme;
        p.NotificationsEnabled = request.NotificationsEnabled;
        await s.SaveProfile(p, ct);
        await Audit(s, c, "profile.updated", "profile", p.Id, ct);
        return Results.Ok(p);
    }
);
api.MapGet(
    "/bank/connections",
    async (HttpContext c, IWorkspaceStore s, CancellationToken ct) =>
        Results.Ok((await s.Connections(User(c), ct)).Select(SafeBank))
);
api.MapGet(
    "/bank/institutions",
    (IBankingProvider provider) => provider.IsConfigured
        ? Results.Ok(provider.SupportedBanks.OrderBy(name => name).Select(name => new { name }))
        : Results.Json(new { code = "BANKING_NOT_CONFIGURED", message = "Le fournisseur bancaire doit être configuré." }, statusCode: 503)
);
api.MapGet(
    "/bank/tink/link",
    (bool? native, HttpContext c, IBankingProvider provider, IDataProtectionProvider protection, TimeProvider time) =>
    {
        if (provider is not TinkBankingProvider tink)
            return Results.Json(new { code = "TINK_NOT_CONFIGURED", message = "Tink doit être configuré." }, statusCode: 503);
        var baseUrl = native == true ? tink.NativeLinkUrl : tink.LinkUrl;
        if (string.IsNullOrWhiteSpace(baseUrl))
            return Results.Json(new { code = "TINK_NATIVE_REDIRECT_NOT_CONFIGURED", message = "Le retour Tink natif doit être configuré." }, statusCode: 503);
        var state = protection.CreateProtector("tink-oauth-state-v1").Protect(
            $"{User(c)}|{time.GetUtcNow().ToUnixTimeSeconds()}|{Guid.NewGuid():N}"
        );
        return Results.Ok(new { url = $"{baseUrl}{(baseUrl.Contains('?') ? '&' : '?')}state={Uri.EscapeDataString(state)}" });
    }
);
api.MapPost(
    "/bank/tink/callback",
    async (TinkCallbackRequest request, HttpContext c, IWorkspaceStore store, IBankingProvider provider, BankSyncProcessor sync, IDataProtectionProvider protection, TimeProvider time, CancellationToken ct) =>
    {
        if (provider is not TinkBankingProvider tink)
            return Unavailable(c, "TINK_NOT_CONFIGURED", "Tink doit être configuré.");
        if (string.IsNullOrWhiteSpace(request.Code))
            return Results.BadRequest(new { code = "TINK_CODE_MISSING", message = "Le code Tink est absent.", correlationId = c.TraceIdentifier });
        try
        {
            var state = protection.CreateProtector("tink-oauth-state-v1").Unprotect(request.State ?? "").Split('|');
            if (state.Length != 3
                || state[0] != User(c)
                || !long.TryParse(state[1], out var timestamp)
                || Math.Abs(time.GetUtcNow().ToUnixTimeSeconds() - timestamp) > 600)
                return Results.Unauthorized();
        }
        catch (CryptographicException)
        {
            return Results.Unauthorized();
        }
        BankConnection bank;
        try
        {
            bank = await tink.CompleteConnection(User(c), request.Code, request.CredentialsId, ct);
        }
        catch (TinkBankingException exception)
        {
            app.Logger.LogWarning("Tink callback failed with {Code}, correlation {CorrelationId}", exception.Code, c.TraceIdentifier);
            return Results.Json(new { code = exception.Code, message = exception.UserMessage, correlationId = c.TraceIdentifier }, statusCode: 502);
        }
        try
        {
            await store.AddConnection(bank, ct);
        }
        catch (Exception exception)
        {
            app.Logger.LogError(exception, "Tink connection persistence failed, correlation {CorrelationId}", c.TraceIdentifier);
            return Results.Json(new { code = "TINK_CONNECTION_SAVE_FAILED", message = "La connexion Tink a réussi mais son enregistrement a échoué.", correlationId = c.TraceIdentifier }, statusCode: 503);
        }
        try
        {
            await sync.Synchronize(bank, ct);
        }
        catch (Exception exception)
        {
            app.Logger.LogWarning(exception, "Initial Tink synchronization failed, correlation {CorrelationId}", c.TraceIdentifier);
        }
        return Results.Created($"/api/v1/bank/connections/{bank.Id}", SafeBank(bank));
    }
).AddEndpointFilter<IdempotencyFilter>();
api.MapGet(
    "/bank/accounts",
    async (HttpContext c, IWorkspaceStore s, CancellationToken ct) =>
        Results.Ok(
            (await s.Accounts(User(c), ct)).Select(a => new
            {
                a.Id,
                a.ConnectionId,
                a.AccountType,
                a.MaskedName,
            })
        )
);
api.MapGet(
    "/bank/transactions",
    async (Guid? connectionId, Guid? accountId, int? limit, HttpContext c, IWorkspaceStore s, CancellationToken ct) =>
    {
        var take = Math.Clamp(limit ?? 30, 1, 100);
        var transactions = (await s.Transactions(User(c), ct))
            .Where(t => connectionId is null || t.ConnectionId == connectionId)
            .Where(t => accountId is null || t.AccountId == accountId)
            .OrderByDescending(t => t.BookedAt)
            .ToArray();
        return Results.Ok(new
        {
            Items = transactions.Take(take).Select(t => new
            {
                t.Id,
                t.ConnectionId,
                t.AccountId,
                t.BookedAt,
                t.Amount,
                t.Currency,
                t.MerchantName,
                t.Category,
            }),
            Total = transactions.Length,
        });
    }
);
api.MapPost(
        "/bank/connections",
        async (
            CreateConnectionRequest request,
            HttpContext c,
            IWorkspaceStore s,
            IBankingProvider provider,
            IProductMetrics metrics,
            CancellationToken ct
        ) =>
        {
            if (!provider.IsConfigured)
                return Unavailable(
                    c,
                    "BANKING_NOT_CONFIGURED",
                    "Le fournisseur bancaire doit être configuré."
                );
            if (!request.ConsentGranted || !provider.SupportedBanks.Contains(request.BankName))
                return Results.BadRequest(
                    new
                    {
                        code = "INVALID_BANK_CONSENT",
                        message = "Sélectionnez une banque compatible et autorisez l’analyse.",
                        correlationId = c.TraceIdentifier,
                    }
                );
            if ((await s.Connections(User(c), ct)).Count >= 5)
                return Results.Conflict(
                    new
                    {
                        code = "BANK_LIMIT",
                        message = "Le nombre maximal de connexions bancaires est atteint.",
                        correlationId = c.TraceIdentifier,
                    }
                );
            var bank = await provider.CreateConnection(User(c), request.BankName, ct);
            try
            {
                await s.AddConnection(bank, ct);
            }
            catch (InvalidOperationException exception) when (exception.Message == "BANK_LIMIT")
            {
                return Results.Conflict(
                    new
                    {
                        code = "BANK_LIMIT",
                        message = "Le nombre maximal de connexions bancaires est atteint.",
                        correlationId = c.TraceIdentifier,
                    }
                );
            }
            metrics.BankConnected();
            await Audit(s, c, "bank.connected", "bank_connection", bank.Id.ToString(), ct);
            return Results.Created($"/api/v1/bank/connections/{bank.Id}", SafeBank(bank));
        }
    )
    .AddEndpointFilter<IdempotencyFilter>();
api.MapPost(
        "/bank/connections/{id:guid}/sync",
        async (
            Guid id,
            HttpContext c,
            IWorkspaceStore s,
            IBankingProvider provider,
            AnalysisService analysis,
            IProductMetrics metrics,
            ITransactionNormalizer normalizer,
            TimeProvider time,
            CancellationToken ct
        ) =>
        {
            if (!provider.IsConfigured)
                return Unavailable(
                    c,
                    "BANKING_NOT_CONFIGURED",
                    "Le fournisseur bancaire doit être configuré."
                );
            var bank = (await s.Connections(User(c), ct)).FirstOrDefault(b => b.Id == id);
            if (bank is null)
                return Missing(c);
            if (bank.ConsentExpiresAt <= DateTimeOffset.UtcNow)
                return Results.Conflict(
                    new
                    {
                        code = "CONSENT_EXPIRED",
                        message = "Veuillez renouveler votre connexion bancaire.",
                        correlationId = c.TraceIdentifier,
                    }
                );
            var isFirstSync = bank.LastSyncAt is null;
            IReadOnlyList<BankTransaction> rows;
            try
            {
                rows = normalizer.Normalize(await provider.FetchTransactions(bank, ct));
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                app.Logger.LogWarning(exception, "Bank synchronization failed, correlation {CorrelationId}", c.TraceIdentifier);
                if (exception is TinkBankingException { Code: "TINK_TRANSACTIONS_401" or "TINK_TRANSACTIONS_403" })
                    await s.SetConnectionStatus(bank, "reconnect_required", ct);
                await s.AddNotification(new()
                {
                    UserId = User(c),
                    Type = "sync_failed",
                    Title = "La synchronisation a échoué",
                    Body = "Nous n’avons pas pu actualiser vos transactions. Réessayez plus tard.",
                    SourceKey = $"sync-failed:{bank.Id}:{DateTimeOffset.UtcNow:yyyyMMddHH}",
                }, ct);
                var code = exception is TinkBankingException tink ? tink.Code : "BANK_SYNC_FAILED";
                var message = exception is TinkBankingException tinkError ? tinkError.UserMessage : "La synchronisation bancaire a échoué.";
                return Results.Json(new { code, message, correlationId = c.TraceIdentifier }, statusCode: 503);
            }
            await s.Synchronize(bank, rows, ct);
            var userId = User(c);
            await s.AddNotification(
                new()
                {
                    UserId = userId,
                    Type = "sync_completed",
                    Title = "Votre analyse est terminée",
                    Body = $"{rows.Count} transactions ont été analysées.",
                    SourceKey = $"sync:{bank.Id}:{bank.LastSyncAt:O}",
                },
                ct
            );
            var detectedPayments = await analysis.Subscriptions(userId, ct);
            var recommendations = await analysis.Recommendations(userId, ct, true);
            await s.SaveAnalysis(userId, detectedPayments, recommendations, ct);
            metrics.BankSynchronized();
            if (isFirstSync) metrics.FirstBankSync();
            metrics.SubscriptionsDetected(detectedPayments.Count);
            var bestSaving = recommendations.FirstOrDefault();
            if (PremiumActive(await s.Premium(userId, ct), time) && bestSaving is not null)
                await s.AddNotification(
                    new()
                    {
                        UserId = userId,
                        Type = "saving_found",
                        Title = "Nouvelle économie détectée",
                        Body = $"Vous pouvez économiser {bestSaving.AnnualSaving:0.##} €/an avec {bestSaving.Title.ToLowerInvariant()}.",
                        ResourceId = bestSaving.Id,
                        SourceKey = $"saving:{bestSaving.Id}",
                    },
                    ct
                );
            await Audit(s, c, "bank.synchronized", "bank_connection", bank.Id.ToString(), ct);
            return Results.Ok(
                new
                {
                    status = "completed",
                    transactionCount = rows.Count,
                    lastSyncAt = bank.LastSyncAt,
                }
            );
        }
    )
    .AddEndpointFilter<IdempotencyFilter>();
api.MapPost(
        "/bank/connections/{id:guid}/sync-jobs",
        async (Guid id, HttpContext c, IWorkspaceStore s, IBankingProvider provider, TimeProvider time, CancellationToken ct) =>
        {
            if (!provider.IsConfigured) return Unavailable(c, "BANKING_NOT_CONFIGURED", "Le fournisseur bancaire doit être configuré.");
            var bank = (await s.Connections(User(c), ct)).FirstOrDefault(b => b.Id == id);
            if (bank is null) return Missing(c);
            if (bank.ConsentExpiresAt <= time.GetUtcNow()) return Results.Conflict(new { code = "CONSENT_EXPIRED", message = "Veuillez renouveler votre connexion bancaire.", correlationId = c.TraceIdentifier });
            var job = await s.EnqueueSync(new BankSyncJob { UserId = User(c), ConnectionId = id, CreatedAt = time.GetUtcNow(), UpdatedAt = time.GetUtcNow() }, ct);
            await Audit(s, c, "bank.sync_queued", "bank_sync_job", job.Id.ToString(), ct);
            return Results.Accepted($"/api/v1/bank/sync-jobs/{job.Id}", new { job.Id, job.ConnectionId, job.Status, job.CreatedAt });
        }
    )
    .AddEndpointFilter<IdempotencyFilter>();
api.MapGet(
    "/bank/sync-jobs/{id:guid}",
    async (Guid id, HttpContext c, IWorkspaceStore s, CancellationToken ct) =>
        await s.SyncJob(User(c), id, ct) is { } job
            ? Results.Ok(new { job.Id, job.ConnectionId, job.Status, job.Attempts, job.TransactionCount, job.ErrorCode, job.CreatedAt, job.UpdatedAt })
            : Missing(c)
);
api.MapDelete(
    "/bank/connections/{id:guid}",
    async (
        Guid id,
        HttpContext c,
        IWorkspaceStore s,
        IBankingProvider provider,
        CancellationToken ct
    ) =>
    {
        var bank = (await s.Connections(User(c), ct)).FirstOrDefault(b => b.Id == id);
        if (bank is null) return Missing(c);
        if (provider.IsConfigured) await provider.RevokeConnection(bank, ct);
        await s.RemoveConnection(User(c), id, ct);
        await Audit(s, c, "bank.disconnected", "bank_connection", id.ToString(), ct);
        return Results.NoContent();
    }
);
api.MapGet(
    "/dashboard",
    async (HttpContext c, AnalysisService s, CancellationToken ct) =>
        Results.Ok(await s.Dashboard(User(c), demo, ct))
);
api.MapGet(
    "/subscriptions",
    async (HttpContext c, AnalysisService s, int? page, int? limit, CancellationToken ct) =>
    {
        if (page is < 1 || limit is < 1 or > 100)
            return Results.BadRequest(
                new
                {
                    code = "INVALID_PAGE",
                    message = "Pagination invalide.",
                    correlationId = c.TraceIdentifier,
                }
            );
        var data = await s.Subscriptions(User(c), ct);
        return Results.Ok(
            new
            {
                items = data.Skip(((page ?? 1) - 1) * (limit ?? 20)).Take(limit ?? 20),
                total = data.Count,
                page = page ?? 1,
                limit = limit ?? 20,
            }
        );
    }
);
api.MapGet(
    "/subscriptions/{id}",
    async (string id, HttpContext c, AnalysisService s, CancellationToken ct) =>
    {
        var p = (await s.Subscriptions(User(c), ct)).FirstOrDefault(p => p.Id == id);
        return p is null ? Missing(c) : Results.Ok(p);
    }
);
api.MapPatch(
    "/subscriptions/{id}",
    async (
        string id,
        SubscriptionPreferenceRequest request,
        HttpContext c,
        AnalysisService analysis,
        IWorkspaceStore store,
        CancellationToken ct
    ) =>
    {
        string[] categories =
        [
            "streaming",
            "software",
            "mobile",
            "internet",
            "insurance",
            "energy",
            "sport",
            "press",
            "cloud",
        ];
        if (
            request.Status is not ("active" or "ignored")
            || (request.Category is not null && !categories.Contains(request.Category))
        )
            return Results.BadRequest(
                new
                {
                    code = "INVALID_SUBSCRIPTION_PREFERENCE",
                    message = "Vérifiez la catégorie et le statut de l’abonnement.",
                    correlationId = c.TraceIdentifier,
                }
            );
        var payment = (await analysis.Subscriptions(User(c), ct)).FirstOrDefault(p => p.Id == id);
        if (payment is null)
            return Missing(c);
        await store.SaveSubscriptionPreference(
            new()
            {
                UserId = User(c),
                SubscriptionId = id,
                Category = request.Category,
                Status = request.Status,
            },
            ct
        );
        var updatedPayments = await analysis.Subscriptions(User(c), ct);
        var updatedRecommendations = await analysis.Recommendations(User(c), ct, true);
        await store.SaveAnalysis(User(c), updatedPayments, updatedRecommendations, ct);
        await Audit(store, c, "subscription.updated", "subscription", id, ct);
        return Results.NoContent();
    }
);
api.MapGet(
    "/recommendations",
    async (HttpContext c, AnalysisService analysis, IWorkspaceStore store, TimeProvider time, CancellationToken ct) =>
    {
        var recommendations = await analysis.Recommendations(User(c), ct);
        var premium = PremiumActive(await store.Premium(User(c), ct), time);
        return Results.Ok(premium ? recommendations : recommendations.Take(3));
    }
);
api.MapGet(
    "/recommendations/realized",
    async (HttpContext c, IWorkspaceStore store, CancellationToken ct) =>
        Results.Ok((await store.RecommendationEvents(User(c), "realized", ct))
            .GroupBy(e => e.RecommendationId, StringComparer.Ordinal)
            .Select(group => group.OrderByDescending(e => e.OccurredAt).First())
            .Select(e => new { e.RecommendationId, e.ConfirmedAnnualSaving, e.OccurredAt }))
);
api.MapGet(
    "/recommendations/{id}",
    async (string id, HttpContext c, AnalysisService analysis, IWorkspaceStore store, TimeProvider time, CancellationToken ct) =>
    {
        var recommendations = await analysis.Recommendations(User(c), ct);
        if (!PremiumActive(await store.Premium(User(c), ct), time))
            recommendations = recommendations.Take(3).ToArray();
        var r = recommendations.FirstOrDefault(r => r.Id == id);
        return r is null ? Missing(c) : Results.Ok(r);
    }
);
api.MapGet(
    "/recommendations/{id}/alternatives",
    async (string id, HttpContext c, AnalysisService analysis, IWorkspaceStore store, TimeProvider time, CancellationToken ct) =>
    {
        if (!PremiumActive(await store.Premium(User(c), ct), time)) return PremiumRequired(c);
        var alternatives = await analysis.Alternatives(User(c), id, ct);
        return alternatives.Count == 0 ? Missing(c) : Results.Ok(alternatives);
    }
);
api.MapPost(
    "/recommendations/{id}/realized",
    async (string id, HttpContext c, AnalysisService analysis, IWorkspaceStore store, CancellationToken ct) =>
    {
        var recommendation = (await analysis.Recommendations(User(c), ct)).FirstOrDefault(r => r.Id == id);
        if (recommendation is null) return Missing(c);
        var alreadyRealized = (await store.RecommendationEvents(User(c), "realized", ct))
            .Any(e => e.RecommendationId == id);
        if (!alreadyRealized)
        {
            await store.AddEvent(new RecommendationEvent
            {
                UserId = User(c),
                RecommendationId = id,
                EventType = "realized",
                ConfirmedAnnualSaving = recommendation.AnnualSaving,
            }, ct);
            await Audit(store, c, "recommendation.realized", "recommendation", id, ct);
        }
        return Results.Ok(new { realized = true });
    }
);
api.MapPost(
    "/recommendations/{id}/view",
    async (
        string id,
        HttpContext c,
        AnalysisService analysis,
        IWorkspaceStore s,
        IProductMetrics metrics,
        CancellationToken ct
    ) =>
    {
        var recommendation = (await analysis.Recommendations(User(c), ct)).FirstOrDefault(r =>
            r.Id == id
        );
        if (recommendation is null) return Missing(c);
        await s.AddEvent(
            new() { UserId = User(c), RecommendationId = id, EventType = "view" },
            ct
        );
        await Audit(s, c, "recommendation.viewed", "recommendation", id, ct);
        metrics.RecommendationViewed();
        return Results.NoContent();
    }
);
api.MapPost(
        "/recommendations/{id}/click",
        async (
            string id,
            HttpContext c,
            AnalysisService analysis,
            IWorkspaceStore s,
            IProductMetrics metrics,
            CancellationToken ct
        ) =>
        {
            var rec = (await analysis.Recommendations(User(c), ct)).FirstOrDefault(r => r.Id == id);
            if (rec is null)
                return Missing(c);
            var click = new RecommendationEvent { UserId = User(c), RecommendationId = id };
            await s.AddEvent(click, ct);
            await Audit(s, c, "recommendation.clicked", "recommendation", id, ct);
            metrics.RecommendationClicked();
            return Results.Ok(
                new
                {
                    tracked = true,
                    eventId = click.Id,
                    isDemo = demo,
                    url = rec.Offer.Url,
                }
            );
        }
    )
    .AddEndpointFilter<IdempotencyFilter>();
api.MapGet(
    "/offers",
    async (string? category, IOfferCatalog offers, CancellationToken ct) =>
        Results.Ok(
            (await offers.GetOffers(ct)).Where(o =>
                o.Active && (category == null || o.Category == category)
            )
        )
);
api.MapGet(
    "/admin/offers",
    async (HttpContext c, IConfiguration configuration, IOfferCatalog offers, CancellationToken ct) =>
        !IsAdmin(c, configuration) ? Results.NotFound() : Results.Ok(await offers.GetOffers(ct))
);
api.MapPut(
    "/admin/offers/{id}",
    async (
        string id,
        OfferRequest request,
        HttpContext c,
        IConfiguration configuration,
        IOfferCatalog offers,
        IWorkspaceStore store,
        CancellationToken ct
    ) =>
    {
        if (!IsAdmin(c, configuration)) return Results.NotFound();
        string[] categories = ["mobile", "internet", "insurance", "energy"];
        var allowedDomains = configuration.GetSection("Offers:AllowedDomains").Get<string[]>() ?? [];
        var validUrl = request.Url is null
            || (Uri.TryCreate(request.Url, UriKind.Absolute, out var offerUrl)
                && offerUrl.Scheme == "https"
                && (demo || allowedDomains.Any(domain =>
                    offerUrl.Host.Equals(domain, StringComparison.OrdinalIgnoreCase)
                    || offerUrl.Host.EndsWith($".{domain}", StringComparison.OrdinalIgnoreCase))));
        if (
            id.Length is < 3 or > 80
            || !id.All(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_')
            || !categories.Contains(request.Category)
            || string.IsNullOrWhiteSpace(request.ProviderName)
            || request.ProviderName.Length > 120
            || request.MonthlyPrice < 0
            || request.SetupFee < 0
            || request.Benefits is null
            || request.Assumptions is null
            || request.Benefits.Length > 20
            || request.Assumptions.Length > 20
            || request.Benefits.Any(value => value.Length > 300)
            || request.Assumptions.Any(value => value.Length > 500)
            || !validUrl
        )
            return Results.BadRequest(
                new
                {
                    code = "INVALID_OFFER",
                    message = "Vérifiez les informations de l’offre.",
                    correlationId = c.TraceIdentifier,
                }
            );
        var offer = new Offer(
            id,
            request.Category,
            request.ProviderName.Trim(),
            request.MonthlyPrice,
            request.SetupFee,
            request.Benefits,
            request.Assumptions,
            request.Active,
            request.IsPartner,
            request.Url
        );
        var saved = await offers.SaveOffer(offer, ct);
        await Audit(store, c, "admin.offer_saved", "offer", id, ct);
        return Results.Ok(saved);
    }
);
api.MapDelete(
    "/admin/offers/{id}",
    async (
        string id,
        HttpContext c,
        IConfiguration configuration,
        IOfferCatalog offers,
        IWorkspaceStore store,
        CancellationToken ct
    ) =>
    {
        if (!IsAdmin(c, configuration)) return Results.NotFound();
        if (!await offers.DeactivateOffer(id, ct)) return Missing(c);
        await Audit(store, c, "admin.offer_deactivated", "offer", id, ct);
        return Results.NoContent();
    }
);
api.MapGet(
    "/consents",
    async (HttpContext c, IWorkspaceStore s, CancellationToken ct) =>
        Results.Ok(await s.Consents(User(c), ct))
);
api.MapPost(
    "/consents/legal",
    async (LegalConsentRequest request, HttpContext c, IWorkspaceStore s, TimeProvider time, CancellationToken ct) =>
    {
        if (request.Version is null || request.Version.Length is < 1 or > 32)
            return Results.BadRequest(new
            {
                code = "INVALID_LEGAL_VERSION",
                message = "La version du texte légal est invalide.",
                correlationId = c.TraceIdentifier,
            });
        var consent = await s.SaveConsent(new Consent
        {
            UserId = User(c),
            Type = "terms_and_privacy",
            Version = request.Version,
            GrantedAt = time.GetUtcNow(),
        }, ct);
        await Audit(s, c, "consent.legal_accepted", "consent", consent.Id.ToString(), ct);
        return Results.Ok(consent);
    }
);
api.MapDelete(
    "/consents/{id:guid}",
    async (Guid id, HttpContext c, IWorkspaceStore s, CancellationToken ct) =>
    {
        if (!await s.RevokeConsent(User(c), id, ct)) return Missing(c);
        await Audit(s, c, "consent.revoked", "consent", id.ToString(), ct);
        return Results.NoContent();
    }
);
api.MapGet(
    "/notifications",
    async (HttpContext c, IWorkspaceStore s, CancellationToken ct) =>
        Results.Ok(
            (await s.Notifications(User(c), ct)).Select(n => new
            {
                n.Id,
                n.Type,
                n.Title,
                n.Body,
                n.ResourceId,
                n.ReadAt,
                n.CreatedAt,
            })
        )
);
api.MapPost(
    "/notifications/{id:guid}/read",
    async (Guid id, HttpContext c, IWorkspaceStore s, CancellationToken ct) =>
    {
        if (!await s.MarkNotificationRead(User(c), id, ct)) return Missing(c);
        await Audit(s, c, "notification.read", "notification", id.ToString(), ct);
        return Results.NoContent();
    }
);
api.MapGet(
    "/push/devices",
    async (HttpContext c, IWorkspaceStore s, CancellationToken ct) =>
        Results.Ok((await s.PushDevices(User(c), ct)).Select(d => new
        {
            d.Id,
            d.Platform,
            d.RegisteredAt,
            d.LastSeenAt,
        }))
);
api.MapPost(
    "/push/devices",
    async (PushDeviceRequest request, HttpContext c, IWorkspaceStore s, TimeProvider time, CancellationToken ct) =>
    {
        var platform = request.Platform.Trim().ToLowerInvariant();
        var token = request.Token.Trim();
        if (platform is not ("ios" or "android") || token.Length is < 20 or > 4096 || token.Any(char.IsWhiteSpace))
            return Results.BadRequest(new
            {
                code = "VALIDATION_ERROR",
                message = "Platform doit valoir ios ou android et le jeton doit être valide.",
                correlationId = c.TraceIdentifier,
            });
        var device = await s.SavePushDevice(new PushDevice
        {
            UserId = User(c),
            Platform = platform,
            Token = token,
            RegisteredAt = time.GetUtcNow(),
            LastSeenAt = time.GetUtcNow(),
        }, ct);
        await Audit(s, c, "push_device.registered", "push_device", device.Id.ToString(), ct);
        return Results.Ok(new { device.Id, device.Platform, device.RegisteredAt, device.LastSeenAt });
    }
);
api.MapDelete(
    "/push/devices/{id:guid}",
    async (Guid id, HttpContext c, IWorkspaceStore s, CancellationToken ct) =>
    {
        if (!await s.RemovePushDevice(User(c), id, ct)) return Missing(c);
        await Audit(s, c, "push_device.removed", "push_device", id.ToString(), ct);
        return Results.NoContent();
    }
);
api.MapGet(
    "/premium/status",
    async (HttpContext c, IWorkspaceStore s, TimeProvider time, CancellationToken ct) =>
    {
        var premium = await s.Premium(User(c), ct);
        var active = PremiumActive(premium, time);
        return Results.Ok(
            new
            {
                status = active ? premium!.Status : "inactive",
                isPremium = active,
                plan = active ? premium!.Plan : null,
                renewsAt = active ? premium!.RenewsAt : (DateTimeOffset?)null,
                provider = active ? premium!.Provider : null,
                isDemo = demo,
            }
        );
    }
);
api.MapPost(
        "/premium/verify-purchase",
        async (
            PurchaseVerificationRequest request,
            HttpContext c,
            IPremiumPurchaseVerifier verifier,
            IWorkspaceStore store,
            IProductMetrics metrics,
            CancellationToken ct
        ) =>
        {
            if (!verifier.IsConfigured)
                return Unavailable(
                    c,
                    "PURCHASE_PROVIDER_NOT_CONFIGURED",
                    "Le fournisseur d’achats doit être configuré."
                );
            var verified = await verifier.Verify(
                User(c),
                request.Provider,
                request.ProductId,
                request.TransactionId,
                request.SignedPayload,
                ct
            );
            if (verified is null)
                return Results.BadRequest(
                    new
                    {
                        code = "INVALID_PURCHASE",
                        message = "L’achat n’a pas pu être vérifié.",
                        correlationId = c.TraceIdentifier,
                    }
                );
            var subscription = new PremiumSubscription
            {
                UserId = User(c),
                Provider = verified.Provider,
                ExternalSubscriptionId = verified.TransactionId,
                Plan = verified.Plan,
                RenewsAt = verified.RenewsAt,
            };
            if (!await store.SavePremium(subscription, ct))
            {
                var current = await store.Premium(User(c), ct);
                if (verified.Provider == "revenuecat"
                    && current?.Provider == verified.Provider
                    && current.ExternalSubscriptionId == verified.TransactionId
                    && current.RenewsAt > DateTimeOffset.UtcNow)
                    return Results.Ok(
                        new
                        {
                            status = current.Status,
                            isPremium = true,
                            current.Plan,
                            current.RenewsAt,
                            current.Provider,
                            isDemo = demo,
                        }
                    );
                return Results.Conflict(
                    new
                    {
                        code = "PURCHASE_ALREADY_USED",
                        message = "Cette transaction a déjà été utilisée.",
                        correlationId = c.TraceIdentifier,
                    }
                );
            }
            await Audit(store, c, "premium.activated", "premium_subscription", subscription.Id.ToString(), ct);
            metrics.PremiumActivated();
            return Results.Ok(
                new
                {
                    status = subscription.Status,
                    isPremium = true,
                    subscription.Plan,
                    subscription.RenewsAt,
                    subscription.Provider,
                    isDemo = demo,
                }
            );
        }
    )
    .AddEndpointFilter<IdempotencyFilter>();
api.MapDelete(
    "/account",
    async (HttpContext c, IWorkspaceStore s, IIdentityLifecycle identity, TimeProvider time, CancellationToken ct) =>
    {
        if (!HasRecentAuthentication(c, time, demo)) return Results.Json(new { code = "RECENT_AUTH_REQUIRED", message = "Reconnectez-vous avant de supprimer le compte.", correlationId = c.TraceIdentifier }, statusCode: 403);
        var job = await s.EnqueueAccountDeletion(User(c), time.GetUtcNow(), ct);
        if (demo) await identity.DeleteIdentity(User(c), ct);
        return Results.Accepted($"/api/v1/account/deletion", new { job.Id, job.Status, job.CreatedAt });
    }
);
api.MapGet(
    "/account/deletion",
    async (HttpContext c, IWorkspaceStore s, CancellationToken ct) =>
    {
        var job = await s.AccountDeletion(User(c), ct);
        return job is null
            ? Missing(c)
            : Results.Ok(new { job.Id, job.Status, job.Attempts, job.CreatedAt, job.UpdatedAt });
    }
);
api.MapGet(
    "/account/export",
    async (HttpContext c, IWorkspaceStore s, TimeProvider time, CancellationToken ct) =>
    {
        if (!HasRecentAuthentication(c, time, demo)) return Results.Json(new { code = "RECENT_AUTH_REQUIRED", message = "Reconnectez-vous avant d’exporter les données.", correlationId = c.TraceIdentifier }, statusCode: 403);
        await Audit(s, c, "account.exported", "account", null, ct);
        return Results.Ok(await s.ExportData(User(c), ct));
    }
);
app.Run();

public sealed record CreateConnectionRequest(string BankName, bool ConsentGranted);
public sealed record LegalConsentRequest(string? Version);
public sealed record TinkCallbackRequest(string Code, string? CredentialsId, string? State);
public sealed record TinkLinkOptions(string Url, string? NativeUrl);

public sealed record ProfileRequest(string FirstName, string Theme, bool NotificationsEnabled);

public sealed record SubscriptionPreferenceRequest(string? Category, string Status);

public sealed record OfferRequest(
    string Category,
    string ProviderName,
    decimal MonthlyPrice,
    decimal SetupFee,
    string[] Benefits,
    string[] Assumptions,
    bool Active,
    bool IsPartner,
    string? Url
);

public sealed record PurchaseVerificationRequest(
    string Provider,
    string ProductId,
    string TransactionId,
    string SignedPayload
);
public sealed record PremiumWebhookRequest(
    string Provider,
    string EventId,
    string SubscriptionId,
    string EventType,
    DateTimeOffset OccurredAt,
    DateTimeOffset? RenewsAt,
    string SignedPayload
);
public sealed record RevenueCatWebhookRequest(RevenueCatWebhookEvent Event);
public sealed record TinkWebhookRequest(string EventId, string CredentialsId, string Type);
public sealed record RevenueCatWebhookEvent(
    string Id,
    string Type,
    [property: JsonPropertyName("app_user_id")] string AppUserId,
    [property: JsonPropertyName("product_id")] string? ProductId,
    [property: JsonPropertyName("transaction_id")] string? TransactionId,
    [property: JsonPropertyName("original_transaction_id")] string? OriginalTransactionId,
    [property: JsonPropertyName("event_timestamp_ms")] long EventTimestampMs,
    [property: JsonPropertyName("expiration_at_ms")] long? ExpirationAtMs
);
public sealed record PushDeviceRequest(string Platform, string Token);
public sealed record AffiliateConversionRequest(string Provider, string ConversionId, Guid EventId, decimal Amount, string Currency);
public sealed record BankConnectionResponse(Guid Id, string BankName, string Provider, string Status, DateTimeOffset? LastSyncAt, DateTimeOffset ConsentExpiresAt, string? AuthorizationUrl);

public partial class Program;
