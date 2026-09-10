using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using SubscriptionApp.Application;
using SubscriptionApp.Domain;
using Xunit;

namespace SubscriptionApp.Tests;

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder) =>
        builder
            .UseEnvironment("Development")
            .ConfigureAppConfiguration(
                (_, c) =>
                    c.AddInMemoryCollection(
                        new Dictionary<string, string?>
                        {
                            ["Demo:Enabled"] = "true",
                            ["ConnectionStrings:Postgres"] = null,
                            ["RevenueCat:WebhookAuthorization"] = "Bearer webhook-test-secret",
                        }
                    )
            );
}

public sealed class ApiTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private async Task<HttpClient> Session()
    {
        var client = factory.CreateClient();
        var session = await client.PostAsync("/api/v1/demo/sessions", null);
        session.EnsureSuccessStatusCode();
        var json = await session.Content.ReadFromJsonAsync<JsonElement>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            json.GetProperty("token").GetString()
        );
        return client;
    }

    private static async Task<HttpResponseMessage> Post(
        HttpClient client,
        string path,
        object? body = null,
        string? key = null
    )
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, path);
        request.Headers.Add("Idempotency-Key", key ?? Guid.NewGuid().ToString());
        if (body != null)
            request.Content = JsonContent.Create(body);
        return await client.SendAsync(request);
    }

    private static async Task<BankConnection> Connect(HttpClient client, string? key = null)
    {
        var response = await Post(
            client,
            "/api/v1/bank/connections",
            new { bankName = "Banque démo", consentGranted = true },
            key
        );
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<BankConnection>())!;
    }

    [Fact]
    public async Task ProtectedRoutesRequireSession()
    {
        using var c = factory.CreateClient();
        Assert.Equal(
            HttpStatusCode.Unauthorized,
            (await c.GetAsync("/api/v1/dashboard")).StatusCode
        );
        Assert.Equal(HttpStatusCode.OK, (await c.GetAsync("/health/live")).StatusCode);
    }

    [Fact]
    public async Task OpenApiDocumentsBearerSecurityAndPublicWebhook()
    {
        using var c = factory.CreateClient();
        var document = await c.GetFromJsonAsync<JsonElement>("/openapi/v1.json");
        Assert.Equal("http", document.GetProperty("components").GetProperty("securitySchemes").GetProperty("Bearer").GetProperty("type").GetString());
        Assert.True(document.GetProperty("paths").GetProperty("/api/v1/profile").GetProperty("get").GetProperty("security").GetArrayLength() > 0);
        Assert.False(document.GetProperty("paths").GetProperty("/api/v1/webhooks/affiliation").GetProperty("post").TryGetProperty("security", out _));
        Assert.False(document.GetProperty("paths").GetProperty("/api/v1/webhooks/premium").GetProperty("post").TryGetProperty("security", out _));
    }

    [Fact]
    public async Task FullJourneyCalculatesConsistentTotalsAndDoesNotDuplicateSync()
    {
        using var c = await Session();
        var bank = await Connect(c);
        (await Post(c, $"/api/v1/bank/connections/{bank.Id}/sync")).EnsureSuccessStatusCode();
        (await Post(c, $"/api/v1/bank/connections/{bank.Id}/sync")).EnsureSuccessStatusCode();
        var dashboard = (await c.GetFromJsonAsync<Dashboard>("/api/v1/dashboard"))!;
        Assert.Equal(8, dashboard.SubscriptionCount);
        Assert.Equal(223.84m, dashboard.MonthlyRecurringCost);
        Assert.Equal(501m, dashboard.AnnualPotentialSaving);
        var rec = dashboard.TopRecommendations[0];
        Assert.Equal(
            HttpStatusCode.Forbidden,
            (await c.GetAsync($"/api/v1/recommendations/{rec.Id}/alternatives")).StatusCode
        );
        (await Post(c, $"/api/v1/recommendations/{rec.Id}/click")).EnsureSuccessStatusCode();
        Assert.Equal(
            HttpStatusCode.NoContent,
            (await c.DeleteAsync($"/api/v1/bank/connections/{bank.Id}")).StatusCode
        );
        Assert.Equal(
            0,
            (await c.GetFromJsonAsync<Dashboard>("/api/v1/dashboard"))!.SubscriptionCount
        );
    }

    [Fact]
    public async Task BankWorkspaceReturnsOnlyTheCurrentUsersAccountsAndTransactions()
    {
        using var owner = await Session();
        using var other = await Session();
        var bank = await Connect(owner);
        (await Post(owner, $"/api/v1/bank/connections/{bank.Id}/sync")).EnsureSuccessStatusCode();

        var accounts = (await owner.GetFromJsonAsync<JsonElement[]>("/api/v1/bank/accounts"))!;
        Assert.NotEmpty(accounts);
        var transactions = (await owner.GetFromJsonAsync<JsonElement>(
            $"/api/v1/bank/transactions?connectionId={bank.Id}&limit=5"));
        Assert.Equal(5, transactions.GetProperty("items").GetArrayLength());
        Assert.True(transactions.GetProperty("total").GetInt32() >= 5);
        Assert.False(transactions.GetProperty("items")[0].TryGetProperty("userId", out _));
        Assert.False(transactions.GetProperty("items")[0].TryGetProperty("externalId", out _));

        var otherTransactions = (await other.GetFromJsonAsync<JsonElement>(
            $"/api/v1/bank/transactions?connectionId={bank.Id}"));
        Assert.Equal(0, otherTransactions.GetProperty("total").GetInt32());
    }

    [Fact]
    public async Task UserCannotReadOrSyncAnotherUsersBank()
    {
        using var a = await Session();
        using var b = await Session();
        var bank = await Connect(a);
        var publicBank = Assert.Single((await a.GetFromJsonAsync<JsonElement[]>("/api/v1/bank/connections"))!);
        Assert.False(publicBank.TryGetProperty("userId", out _));
        Assert.False(publicBank.TryGetProperty("externalConnectionId", out _));
        Assert.Equal(
            HttpStatusCode.NotFound,
            (await Post(b, $"/api/v1/bank/connections/{bank.Id}/sync")).StatusCode
        );
        Assert.Empty((await b.GetFromJsonAsync<BankConnection[]>("/api/v1/bank/connections"))!);
        (await Post(a, $"/api/v1/bank/connections/{bank.Id}/sync")).EnsureSuccessStatusCode();
        var rec = (await a.GetFromJsonAsync<Dashboard>("/api/v1/dashboard"))!.TopRecommendations[0];
        Assert.Equal(
            HttpStatusCode.NotFound,
            (await b.GetAsync($"/api/v1/recommendations/{rec.Id}")).StatusCode
        );
    }

    [Fact]
    public async Task RetriedConnectionReturnsSameResourceAndConflictingPayloadFails()
    {
        using var c = await Session();
        var key = Guid.NewGuid().ToString();
        var a = await Connect(c, key);
        var b = await Connect(c, key);
        Assert.Equal(a.Id, b.Id);
        var conflict = await Post(
            c,
            "/api/v1/bank/connections",
            new { bankName = "Banque Horizon (test)", consentGranted = true },
            key
        );
        Assert.Equal(HttpStatusCode.Conflict, conflict.StatusCode);
        Assert.Single((await c.GetFromJsonAsync<BankConnection[]>("/api/v1/bank/connections"))!);
    }

    [Fact]
    public async Task ConsentAndIdempotencyKeyAreRequired()
    {
        using var c = await Session();
        Assert.Equal(
            HttpStatusCode.BadRequest,
            (
                await Post(
                    c,
                    "/api/v1/bank/connections",
                    new { bankName = "Banque démo", consentGranted = false }
                )
            ).StatusCode
        );
        Assert.Equal(
            HttpStatusCode.BadRequest,
            (
                await c.PostAsJsonAsync(
                    "/api/v1/bank/connections",
                    new { bankName = "Banque démo", consentGranted = true }
                )
            ).StatusCode
        );
    }

    [Fact]
    public async Task AccountDeletionRevokesSession()
    {
        using var c = await Session();
        await Connect(c);
        Assert.Equal(HttpStatusCode.Accepted, (await c.DeleteAsync("/api/v1/account")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await c.GetAsync("/api/v1/profile")).StatusCode);
    }

    [Fact]
    public async Task PaginationRejectsInvalidLimit()
    {
        using var c = await Session();
        Assert.Equal(
            HttpStatusCode.BadRequest,
            (await c.GetAsync("/api/v1/subscriptions?limit=0")).StatusCode
        );
    }

    [Fact]
    public async Task SyncCreatesNotificationWithoutPremiumSavingAlert()
    {
        using var c = await Session();
        var bank = await Connect(c);
        (await Post(c, $"/api/v1/bank/connections/{bank.Id}/sync")).EnsureSuccessStatusCode();

        var notifications =
            (await c.GetFromJsonAsync<UserNotification[]>("/api/v1/notifications"))!;
        Assert.Contains(notifications, n => n.Type == "sync_completed");
        Assert.DoesNotContain(notifications, n => n.Type == "saving_found");

        var selected = notifications[0];
        Assert.Null(selected.ReadAt);
        (await c.PostAsync($"/api/v1/notifications/{selected.Id}/read", null))
            .EnsureSuccessStatusCode();
        var updated =
            (await c.GetFromJsonAsync<UserNotification[]>("/api/v1/notifications"))!;
        Assert.NotNull(updated.Single(n => n.Id == selected.Id).ReadAt);
    }

    [Fact]
    public async Task UserCannotReadAnotherUsersNotification()
    {
        using var a = await Session();
        using var b = await Session();
        var bank = await Connect(a);
        (await Post(a, $"/api/v1/bank/connections/{bank.Id}/sync")).EnsureSuccessStatusCode();
        var notification =
            (await a.GetFromJsonAsync<UserNotification[]>("/api/v1/notifications"))![0];

        Assert.Equal(
            HttpStatusCode.NotFound,
            (await b.PostAsync($"/api/v1/notifications/{notification.Id}/read", null)).StatusCode
        );
    }

    [Fact]
    public async Task UserCanCorrectAndIgnoreDetectedSubscription()
    {
        using var c = await Session();
        var bank = await Connect(c);
        (await Post(c, $"/api/v1/bank/connections/{bank.Id}/sync")).EnsureSuccessStatusCode();
        var before = (await c.GetFromJsonAsync<JsonElement>("/api/v1/subscriptions?limit=100"))
            .GetProperty("items");
        var selectedId = before[0].GetProperty("id").GetString()!;

        var corrected = await c.PatchAsJsonAsync(
            $"/api/v1/subscriptions/{selectedId}",
            new { category = "cloud", status = "active" }
        );
        corrected.EnsureSuccessStatusCode();
        Assert.Equal(
            "cloud",
            (await c.GetFromJsonAsync<Payment>($"/api/v1/subscriptions/{selectedId}"))!.Category
        );

        var ignored = await c.PatchAsJsonAsync(
            $"/api/v1/subscriptions/{selectedId}",
            new { category = "cloud", status = "ignored" }
        );
        ignored.EnsureSuccessStatusCode();
        Assert.Equal(
            HttpStatusCode.NotFound,
            (await c.GetAsync($"/api/v1/subscriptions/{selectedId}")).StatusCode
        );
        var after =
            (await c.GetFromJsonAsync<JsonElement>("/api/v1/subscriptions?limit=100"))
                .GetProperty("total")
                .GetInt32();
        Assert.Equal(before.GetArrayLength() - 1, after);
    }

    [Fact]
    public async Task SubscriptionPreferenceRejectsUnknownCategory()
    {
        using var c = await Session();
        var response = await c.PatchAsJsonAsync(
            "/api/v1/subscriptions/unknown",
            new { category = "unknown", status = "active" }
        );
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UserCanExportDataAndRevokeBankConsent()
    {
        using var c = await Session();
        var bank = await Connect(c);
        (await Post(c, $"/api/v1/bank/connections/{bank.Id}/sync")).EnsureSuccessStatusCode();
        var exportResponse = await c.GetAsync("/api/v1/account/export");
        exportResponse.EnsureSuccessStatusCode();
        var exportJson = await exportResponse.Content.ReadAsStringAsync();
        Assert.DoesNotContain("providerSecret", exportJson, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("authorizationUrl", exportJson, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("\"token\"", exportJson, StringComparison.OrdinalIgnoreCase);
        var export = JsonSerializer.Deserialize<UserDataExport>(
            exportJson,
            new JsonSerializerOptions(JsonSerializerDefaults.Web)
        )!;
        Assert.Equal(48, export.Transactions.Count);
        Assert.Single(export.Connections);
        var account = Assert.Single(export.Accounts);
        Assert.StartsWith("Compte ••••", account.MaskedName);
        Assert.All(export.Transactions, transaction => Assert.Equal(account.Id, transaction.AccountId));
        Assert.Equal(8, export.StoredPayments.Count);
        Assert.Equal(3, export.StoredRecommendations.Count);
        Assert.Contains(export.AuditLogs, audit => audit.Action == "bank.connected");
        Assert.Contains(export.AuditLogs, audit => audit.Action == "bank.synchronized");
        Assert.Contains(export.AuditLogs, audit => audit.Action == "account.exported");
        Assert.All(export.Transactions, transaction => Assert.Equal(export.Profile.Id, transaction.UserId));

        var consent = Assert.Single(export.Consents);
        Assert.Null(consent.RevokedAt);
        Assert.Equal(
            HttpStatusCode.NoContent,
            (await c.DeleteAsync($"/api/v1/consents/{consent.Id}")).StatusCode
        );
        var revoked = Assert.Single(
            (await c.GetFromJsonAsync<Consent[]>("/api/v1/consents"))!
        );
        Assert.NotNull(revoked.RevokedAt);
        Assert.Equal(
            HttpStatusCode.Conflict,
            (await Post(c, $"/api/v1/bank/connections/{bank.Id}/sync")).StatusCode
        );
    }

    [Fact]
    public async Task LegalConsentIsVersionedAndIdempotent()
    {
        using var c = await Session();
        var first = await c.PostAsJsonAsync("/api/v1/consents/legal", new { version = "1.0" });
        var second = await c.PostAsJsonAsync("/api/v1/consents/legal", new { version = "1.0" });
        first.EnsureSuccessStatusCode();
        second.EnsureSuccessStatusCode();
        var legal = (await c.GetFromJsonAsync<Consent[]>("/api/v1/consents"))!
            .Where(consent => consent.Type == "terms_and_privacy")
            .ToArray();
        Assert.Single(legal);
        Assert.Equal("1.0", legal[0].Version);
    }

    [Fact]
    public async Task UserCannotExportOrRevokeAnotherUsersData()
    {
        using var a = await Session();
        using var b = await Session();
        await Connect(a);
        var consent = Assert.Single((await a.GetFromJsonAsync<Consent[]>("/api/v1/consents"))!);

        Assert.Equal(
            HttpStatusCode.NotFound,
            (await b.DeleteAsync($"/api/v1/consents/{consent.Id}")).StatusCode
        );
        var export = (await b.GetFromJsonAsync<UserDataExport>("/api/v1/account/export"))!;
        Assert.Empty(export.Connections);
        Assert.Empty(export.Accounts);
        Assert.Empty(export.Transactions);
    }

    [Fact]
    public async Task AdminCanManageOfferCatalogWithoutMobileRelease()
    {
        using var c = await Session();
        var id = $"energy-{Guid.NewGuid():N}";
        var body = new
        {
            category = "energy",
            providerName = "Énergie test",
            monthlyPrice = 42.50m,
            setupFee = 0m,
            benefits = new[] { "Offre de test" },
            assumptions = new[] { "Éligibilité à vérifier." },
            active = true,
            isPartner = true,
            url = "https://example.test/offer",
        };
        Assert.Equal(
            HttpStatusCode.NotFound,
            (await c.PutAsJsonAsync($"/api/v1/admin/offers/{id}", body)).StatusCode
        );
        using var create = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/admin/offers/{id}")
        {
            Content = JsonContent.Create(body),
        };
        create.Headers.Add("X-Admin-Key", "local-admin-development-only");
        (await c.SendAsync(create)).EnsureSuccessStatusCode();
        var offers = (await c.GetFromJsonAsync<Offer[]>("/api/v1/offers?category=energy"))!;
        Assert.Contains(offers, offer => offer.Id == id);

        using var deactivate = new HttpRequestMessage(
            HttpMethod.Delete,
            $"/api/v1/admin/offers/{id}"
        );
        deactivate.Headers.Add("X-Admin-Key", "local-admin-development-only");
        Assert.Equal(HttpStatusCode.NoContent, (await c.SendAsync(deactivate)).StatusCode);
        offers = (await c.GetFromJsonAsync<Offer[]>("/api/v1/offers?category=energy"))!;
        Assert.DoesNotContain(offers, offer => offer.Id == id);
    }

    [Fact]
    public async Task PremiumPurchaseRequiresValidServerSignatureAndCannotBeReused()
    {
        using var c = await Session();
        var profile = (await c.GetFromJsonAsync<UserProfile>("/api/v1/profile"))!;
        var transactionId = $"transaction-{Guid.NewGuid():N}";
        var productId = "premium_monthly";
        var provider = "app_store";
        var payload = $"{profile.Id}|{provider}|{productId}|{transactionId}";
        var signature = Convert.ToHexString(
            HMACSHA256.HashData(
                Encoding.UTF8.GetBytes("local-premium-verifier-secret-only"),
                Encoding.UTF8.GetBytes(payload)
            )
        );
        var body = new
        {
            provider,
            productId,
            transactionId,
            signedPayload = signature,
        };
        Assert.Equal(
            HttpStatusCode.BadRequest,
            (
                await Post(
                    c,
                    "/api/v1/premium/verify-purchase",
                    new { provider, productId, transactionId, signedPayload = "invalid" }
                )
            ).StatusCode
        );
        var idempotencyKey = Guid.NewGuid().ToString();
        (await Post(c, "/api/v1/premium/verify-purchase", body, idempotencyKey))
            .EnsureSuccessStatusCode();
        var status = await c.GetFromJsonAsync<JsonElement>("/api/v1/premium/status");
        Assert.True(status.GetProperty("isPremium").GetBoolean());
        Assert.Equal("monthly", status.GetProperty("plan").GetString());
        var bank = await Connect(c);
        (await Post(c, $"/api/v1/bank/connections/{bank.Id}/sync")).EnsureSuccessStatusCode();
        Assert.Contains(
            (await c.GetFromJsonAsync<UserNotification[]>("/api/v1/notifications"))!,
            notification => notification.Type == "saving_found" && notification.ResourceId is not null
        );
        var recommendation = (await c.GetFromJsonAsync<Recommendation[]>("/api/v1/recommendations"))![0];
        Assert.NotEmpty(
            (await c.GetFromJsonAsync<Recommendation[]>(
                $"/api/v1/recommendations/{recommendation.Id}/alternatives"
            ))!
        );
        Assert.Equal(
            HttpStatusCode.Conflict,
            (
                await Post(
                    c,
                    "/api/v1/premium/verify-purchase",
                    new
                    {
                        provider,
                        productId,
                        transactionId = $"different-{Guid.NewGuid():N}",
                        signedPayload = signature,
                    },
                    idempotencyKey
                )
            ).StatusCode
        );
        Assert.Equal(
            HttpStatusCode.Conflict,
            (await Post(c, "/api/v1/premium/verify-purchase", body)).StatusCode
        );
    }

    [Fact]
    public async Task PremiumWebhookKeepsCancelledEntitlementUntilExpirationAndIsIdempotent()
    {
        using var c = await Session();
        var profile = (await c.GetFromJsonAsync<UserProfile>("/api/v1/profile"))!;
        var provider = "app_store";
        var productId = "premium_monthly";
        var transactionId = $"transaction-{Guid.NewGuid():N}";
        var purchaseSignature = Convert.ToHexString(HMACSHA256.HashData(
            Encoding.UTF8.GetBytes("local-premium-verifier-secret-only"),
            Encoding.UTF8.GetBytes($"{profile.Id}|{provider}|{productId}|{transactionId}")));
        (await Post(c, "/api/v1/premium/verify-purchase", new
        {
            provider,
            productId,
            transactionId,
            signedPayload = purchaseSignature,
        })).EnsureSuccessStatusCode();

        var eventId = $"event-{Guid.NewGuid():N}";
        var occurredAt = DateTimeOffset.UtcNow.AddSeconds(1);
        var canonical = $"{provider}|{eventId}|{transactionId}|cancelled|{occurredAt:O}|";
        var eventSignature = Convert.ToHexString(HMACSHA256.HashData(
            Encoding.UTF8.GetBytes("local-premium-verifier-secret-only"), Encoding.UTF8.GetBytes(canonical)));
        var webhook = new { provider, eventId, subscriptionId = transactionId, eventType = "cancelled", occurredAt, renewsAt = (DateTimeOffset?)null, signedPayload = eventSignature };
        var first = await c.PostAsJsonAsync("/api/v1/webhooks/premium", webhook);
        first.EnsureSuccessStatusCode();
        var second = await c.PostAsJsonAsync("/api/v1/webhooks/premium", webhook);
        second.EnsureSuccessStatusCode();
        Assert.True((await second.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("duplicateOrStale").GetBoolean());
        var status = await c.GetFromJsonAsync<JsonElement>("/api/v1/premium/status");
        Assert.True(status.GetProperty("isPremium").GetBoolean());
        Assert.Equal("cancelled", status.GetProperty("status").GetString());

        var expiryEventId = $"event-{Guid.NewGuid():N}";
        var expiryOccurredAt = occurredAt.AddSeconds(1);
        var expiryCanonical = $"{provider}|{expiryEventId}|{transactionId}|expired|{expiryOccurredAt:O}|";
        var expirySignature = Convert.ToHexString(HMACSHA256.HashData(
            Encoding.UTF8.GetBytes("local-premium-verifier-secret-only"), Encoding.UTF8.GetBytes(expiryCanonical)));
        (await c.PostAsJsonAsync("/api/v1/webhooks/premium", new
        {
            provider,
            eventId = expiryEventId,
            subscriptionId = transactionId,
            eventType = "expired",
            occurredAt = expiryOccurredAt,
            renewsAt = (DateTimeOffset?)null,
            signedPayload = expirySignature,
        })).EnsureSuccessStatusCode();
        status = await c.GetFromJsonAsync<JsonElement>("/api/v1/premium/status");
        Assert.False(status.GetProperty("isPremium").GetBoolean());
    }

    [Fact]
    public async Task ProductionAuthenticationDoesNotExposeDemoSessions()
    {
        await using var production = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
            builder
                .UseEnvironment("Production")
                .UseSetting("Demo:Enabled", "false")
                .UseSetting("Firebase:ProjectId", "test-firebase-project")
                .UseSetting("Cors:Origins:0", "https://app.example.test")
                .UseSetting("ConnectionStrings:Postgres", "Host=127.0.0.1;Port=1;Database=test;Username=test;Password=test;Timeout=1;Command Timeout=1")
                .UseSetting("Database:ApplyMigrationsOnStartup", "false")
        );
        using var client = production.CreateClient();

        Assert.Equal(
            HttpStatusCode.NotFound,
            (await client.PostAsync("/api/v1/demo/sessions", null)).StatusCode
        );
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            "invalid-token"
        );
        Assert.Equal(
            HttpStatusCode.Unauthorized,
            (await client.GetAsync("/api/v1/profile")).StatusCode
        );
        var health = await client.GetFromJsonAsync<JsonElement>("/health");
        Assert.Equal("ok", health.GetProperty("status").GetString());
        Assert.False(health.TryGetProperty("mode", out _));
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await client.GetAsync("/health/ready")).StatusCode);
    }

    [Fact]
    public async Task PushDevicesAreValidatedAndIsolatedPerUser()
    {
        using var a = await Session();
        using var b = await Session();
        Assert.Equal(
            HttpStatusCode.BadRequest,
            (await a.PostAsJsonAsync("/api/v1/push/devices", new { platform = "web", token = "short" })).StatusCode
        );
        var token = $"ExponentPushToken[{Guid.NewGuid():N}]";
        var createdResponse = await a.PostAsJsonAsync("/api/v1/push/devices", new { platform = "android", token });
        createdResponse.EnsureSuccessStatusCode();
        var created = await createdResponse.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("id").GetGuid();

        var own = (await a.GetFromJsonAsync<JsonElement[]>("/api/v1/push/devices"))!;
        Assert.Contains(own, d => d.GetProperty("id").GetGuid() == id);
        Assert.DoesNotContain(own[0].EnumerateObject(), p => p.NameEquals("token"));
        Assert.Empty((await b.GetFromJsonAsync<JsonElement[]>("/api/v1/push/devices"))!);
        Assert.Equal(HttpStatusCode.NotFound, (await b.DeleteAsync($"/api/v1/push/devices/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await a.DeleteAsync($"/api/v1/push/devices/{id}")).StatusCode);
    }

    [Fact]
    public async Task DurableSyncJobRunsInBackgroundAndRemainsUserScoped()
    {
        using var owner = await Session();
        using var other = await Session();
        var bank = await Connect(owner);
        var queued = await Post(owner, $"/api/v1/bank/connections/{bank.Id}/sync-jobs");
        Assert.Equal(HttpStatusCode.Accepted, queued.StatusCode);
        var payload = await queued.Content.ReadFromJsonAsync<JsonElement>();
        var id = payload.GetProperty("id").GetGuid();
        Assert.Equal(HttpStatusCode.NotFound, (await other.GetAsync($"/api/v1/bank/sync-jobs/{id}")).StatusCode);

        JsonElement job = default;
        for (var attempt = 0; attempt < 30; attempt++)
        {
            job = await owner.GetFromJsonAsync<JsonElement>($"/api/v1/bank/sync-jobs/{id}");
            if (job.GetProperty("status").GetString() is "completed" or "failed") break;
            await Task.Delay(100);
        }
        Assert.Equal("completed", job.GetProperty("status").GetString());
        Assert.True(job.GetProperty("transactionCount").GetInt32() > 0);
    }

    [Fact]
    public async Task AffiliationWebhookRequiresSignatureAndDeduplicatesConversion()
    {
        using var c = await Session();
        var bank = await Connect(c);
        (await Post(c, $"/api/v1/bank/connections/{bank.Id}/sync")).EnsureSuccessStatusCode();
        var rec = (await c.GetFromJsonAsync<Dashboard>("/api/v1/dashboard"))!.TopRecommendations[0];
        var clickResponse = await Post(c, $"/api/v1/recommendations/{rec.Id}/click");
        var click = await clickResponse.Content.ReadFromJsonAsync<JsonElement>();
        var eventId = click.GetProperty("eventId").GetGuid();
        var conversionId = $"conversion-{Guid.NewGuid():N}";
        var body = new { provider = "partner-test", conversionId, eventId, amount = 12.5m, currency = "EUR" };
        Assert.Equal(HttpStatusCode.Unauthorized, (await c.PostAsJsonAsync("/api/v1/webhooks/affiliation", body)).StatusCode);

        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        var canonical = $"{timestamp}|partner-test|{conversionId}|{eventId}|12.5|EUR";
        var signature = Convert.ToHexString(HMACSHA256.HashData(
            Encoding.UTF8.GetBytes("local-affiliation-webhook-secret-only"), Encoding.UTF8.GetBytes(canonical)));
        async Task<JsonElement> Send()
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/webhooks/affiliation") { Content = JsonContent.Create(body) };
            request.Headers.Add("X-Webhook-Signature", signature);
            request.Headers.Add("X-Webhook-Timestamp", timestamp);
            var response = await c.SendAsync(request);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadFromJsonAsync<JsonElement>();
        }
        Assert.False((await Send()).TryGetProperty("duplicate", out _));
        Assert.True((await Send()).GetProperty("duplicate").GetBoolean());
    }

    [Fact]
    public async Task RevenueCatWebhookRequiresConfiguredAuthorization()
    {
        using var c = factory.CreateClient();
        var body = new
        {
            @event = new
            {
                id = $"event-{Guid.NewGuid():N}",
                type = "TEST",
                app_user_id = "firebase-user",
                product_id = "premium_monthly",
                transaction_id = "transaction-id",
                original_transaction_id = "original-transaction-id",
                event_timestamp_ms = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            },
        };

        Assert.Equal(
            HttpStatusCode.Unauthorized,
            (await c.PostAsJsonAsync("/api/v1/webhooks/revenuecat", body)).StatusCode
        );
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/webhooks/revenuecat")
        {
            Content = JsonContent.Create(body),
        };
        request.Headers.TryAddWithoutValidation("Authorization", "Bearer webhook-test-secret");
        var response = await c.SendAsync(request);
        response.EnsureSuccessStatusCode();
        Assert.True((await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("ignored").GetBoolean());
    }

    [Fact]
    public async Task RevenueCatWebhookVerifiesTimestampedHmacWhenConfigured()
    {
        const string signingSecret = "revenuecat-signing-secret-long-enough-for-tests";
        await using var signedFactory = factory.WithWebHostBuilder(builder =>
            builder.UseSetting("RevenueCat:WebhookSigningSecret", signingSecret));
        using var c = signedFactory.CreateClient();
        var body = new
        {
            @event = new
            {
                id = $"event-{Guid.NewGuid():N}",
                type = "TEST",
                app_user_id = "firebase-user",
                product_id = "premium_monthly",
                transaction_id = "transaction-id",
                original_transaction_id = "original-transaction-id",
                event_timestamp_ms = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            },
        };
        var raw = JsonSerializer.Serialize(body, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        var signature = Convert.ToHexString(HMACSHA256.HashData(
            Encoding.UTF8.GetBytes(signingSecret),
            Encoding.UTF8.GetBytes($"{timestamp}.{raw}"))).ToLowerInvariant();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/webhooks/revenuecat")
        {
            Content = new StringContent(raw, Encoding.UTF8, "application/json"),
        };
        request.Headers.TryAddWithoutValidation("Authorization", "Bearer webhook-test-secret");
        request.Headers.TryAddWithoutValidation(
            "X-RevenueCat-Webhook-Signature",
            $"t={timestamp},v1={signature}"
        );
        var response = await c.SendAsync(request);
        response.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task FailedImmediateBankSyncCreatesNotification()
    {
        await using var failing = factory.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        {
            services.RemoveAll<IBankingProvider>();
            services.AddSingleton<IBankingProvider, FailingBankingProvider>();
        }));
        using var c = failing.CreateClient();
        var session = await c.PostAsync("/api/v1/demo/sessions", null);
        var token = (await session.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("token").GetString();
        c.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var bank = await Connect(c);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await Post(c, $"/api/v1/bank/connections/{bank.Id}/sync")).StatusCode);
        var notifications = (await c.GetFromJsonAsync<JsonElement[]>("/api/v1/notifications"))!;
        Assert.Contains(notifications, n => n.GetProperty("type").GetString() == "sync_failed");
    }

    private sealed class FailingBankingProvider : IBankingProvider
    {
        public bool IsConfigured => true;
        public IReadOnlySet<string> SupportedBanks { get; } = new HashSet<string> { "Banque démo" };
        public Task<BankConnection> CreateConnection(string userId, string bankName, CancellationToken ct) => Task.FromResult(new BankConnection { UserId = userId, BankName = bankName, ExternalConnectionId = Guid.NewGuid().ToString() });
        public Task<IReadOnlyList<BankTransaction>> FetchTransactions(BankConnection connection, CancellationToken ct) => throw new HttpRequestException("provider unavailable");
        public Task RevokeConnection(BankConnection connection, CancellationToken ct) => Task.CompletedTask;
    }
}
