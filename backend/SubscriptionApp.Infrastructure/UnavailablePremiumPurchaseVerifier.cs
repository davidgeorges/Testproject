using SubscriptionApp.Application;

namespace SubscriptionApp.Infrastructure;

public sealed class UnavailablePremiumPurchaseVerifier : IPremiumPurchaseVerifier
{
    public bool IsConfigured => false;

    public Task<VerifiedPurchase?> Verify(
        string userId,
        string provider,
        string productId,
        string transactionId,
        string signedPayload,
        CancellationToken ct
    ) => Task.FromResult<VerifiedPurchase?>(null);
}
