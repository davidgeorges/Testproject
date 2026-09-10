using System.Net;
using System.Text;
using SubscriptionApp.Infrastructure;
using Xunit;

namespace SubscriptionApp.Tests;

public sealed class RevenueCatPurchaseVerifierTests
{
    [Fact]
    public async Task ActiveEntitlementIsVerifiedFromRevenueCatSubscriber()
    {
        var handler = new RevenueCatHandler(
            """
            {
              "subscriber": {
                "entitlements": {
                  "premium": {
                    "expires_date": "2099-01-01T00:00:00Z",
                    "product_identifier": "premium_annual"
                  }
                },
                "subscriptions": {
                  "premium_annual": {
                    "original_transaction_id": "original-transaction"
                  }
                }
              }
            }
            """
        );
        var verifier = new RevenueCatPurchaseVerifier(
            new HttpClient(handler) { BaseAddress = new Uri("https://api.revenuecat.com") },
            "secret-key",
            "premium",
            new Dictionary<string, string> { ["premium_annual"] = "annual" }
        );

        var purchase = await verifier.Verify(
            "firebase-user",
            "revenuecat",
            "premium_annual",
            "client-transaction",
            "unused",
            CancellationToken.None
        );

        Assert.NotNull(purchase);
        Assert.Equal("annual", purchase.Plan);
        Assert.Equal("original-transaction", purchase.TransactionId);
        Assert.Equal("Bearer secret-key", handler.Authorization);
        Assert.Equal("/v1/subscribers/firebase-user", handler.Path);
    }

    [Fact]
    public async Task ExpiredEntitlementIsRejected()
    {
        var handler = new RevenueCatHandler(
            """
            {"subscriber":{"entitlements":{"premium":{"expires_date":"2020-01-01T00:00:00Z","product_identifier":"premium_monthly"}}}}
            """
        );
        var verifier = new RevenueCatPurchaseVerifier(
            new HttpClient(handler) { BaseAddress = new Uri("https://api.revenuecat.com") },
            "secret-key",
            "premium",
            new Dictionary<string, string> { ["premium_monthly"] = "monthly" }
        );

        var purchase = await verifier.Verify(
            "firebase-user",
            "revenuecat",
            "premium_monthly",
            "client-transaction",
            "unused",
            CancellationToken.None
        );

        Assert.Null(purchase);
    }

    private sealed class RevenueCatHandler(string json) : HttpMessageHandler
    {
        public string? Authorization { get; private set; }
        public string? Path { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        )
        {
            Authorization = request.Headers.Authorization?.ToString();
            Path = request.RequestUri?.AbsolutePath;
            return Task.FromResult(
                new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(json, Encoding.UTF8, "application/json"),
                }
            );
        }
    }
}
