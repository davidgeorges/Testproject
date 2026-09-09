using System.Security.Cryptography;
using System.Text;
using SubscriptionApp.Application;

namespace SubscriptionApp.Infrastructure;

public sealed class SandboxPremiumPurchaseVerifier(string secret, TimeProvider time)
    : IPremiumPurchaseVerifier
{
    public bool IsConfigured => true;

    public Task<VerifiedPurchase?> Verify(
        string userId,
        string provider,
        string productId,
        string transactionId,
        string signedPayload,
        CancellationToken ct
    )
    {
        if (
            provider is not ("app_store" or "play_store")
            || productId is not ("premium_monthly" or "premium_annual")
            || transactionId.Length is < 8 or > 160
        )
            return Task.FromResult<VerifiedPurchase?>(null);
        var message = Encoding.UTF8.GetBytes(
            $"{userId}|{provider}|{productId}|{transactionId}"
        );
        var expected = HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), message);
        byte[] provided;
        try
        {
            provided = Convert.FromHexString(signedPayload);
        }
        catch (FormatException)
        {
            return Task.FromResult<VerifiedPurchase?>(null);
        }
        if (
            provided.Length != expected.Length
            || !CryptographicOperations.FixedTimeEquals(expected, provided)
        )
            return Task.FromResult<VerifiedPurchase?>(null);
        var now = time.GetUtcNow();
        return Task.FromResult<VerifiedPurchase?>(
            new(
                provider,
                transactionId,
                productId == "premium_monthly" ? "monthly" : "annual",
                productId == "premium_monthly" ? now.AddMonths(1) : now.AddYears(1)
            )
        );
    }
}
