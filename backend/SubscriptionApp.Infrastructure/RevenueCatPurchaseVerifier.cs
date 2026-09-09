using System.Net.Http.Headers;
using System.Text.Json;
using SubscriptionApp.Application;

namespace SubscriptionApp.Infrastructure;

public sealed class RevenueCatPurchaseVerifier(
    HttpClient http,
    string secretApiKey,
    string entitlementId
) : IPremiumPurchaseVerifier
{
    public bool IsConfigured => true;

    public async Task<VerifiedPurchase?> Verify(
        string userId,
        string provider,
        string productId,
        string transactionId,
        string signedPayload,
        CancellationToken ct
    )
    {
        if (provider != "revenuecat" || string.IsNullOrWhiteSpace(userId)) return null;
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"/v1/subscribers/{Uri.EscapeDataString(userId)}"
        );
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", secretApiKey);
        using var response = await http.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode) return null;
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
        if (!json.RootElement.TryGetProperty("subscriber", out var subscriber)
            || !subscriber.TryGetProperty("entitlements", out var entitlements)
            || !entitlements.TryGetProperty(entitlementId, out var entitlement)) return null;
        var expiresText = Text(entitlement, "expires_date");
        if (!DateTimeOffset.TryParse(expiresText, out var expiresAt) || expiresAt <= DateTimeOffset.UtcNow) return null;
        var verifiedProduct = Text(entitlement, "product_identifier") ?? productId;
        var externalId = verifiedProduct;
        if (subscriber.TryGetProperty("subscriptions", out var subscriptions)
            && subscriptions.TryGetProperty(verifiedProduct, out var subscription))
            externalId = Text(subscription, "original_transaction_id")
                ?? Text(subscription, "store_transaction_id")
                ?? $"{userId}:{verifiedProduct}";
        var plan = verifiedProduct.Contains("annual", StringComparison.OrdinalIgnoreCase)
            || verifiedProduct.Contains("year", StringComparison.OrdinalIgnoreCase)
            ? "annual"
            : "monthly";
        return new("revenuecat", externalId, plan, expiresAt);
    }

    private static string? Text(JsonElement value, string property) =>
        value.TryGetProperty(property, out var item) && item.ValueKind == JsonValueKind.String
            ? item.GetString()
            : null;
}
