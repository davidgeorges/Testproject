using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using SubscriptionApp.Application;

namespace SubscriptionApp.Infrastructure;

public sealed class SandboxPremiumEventVerifier(string secret) : IPremiumEventVerifier
{
    public bool IsConfigured => true;

    public Task<VerifiedPremiumEvent?> Verify(string provider, string eventId, string subscriptionId, string eventType, DateTimeOffset occurredAt, DateTimeOffset? renewsAt, string signedPayload, CancellationToken ct)
    {
        if (provider is not ("app_store" or "play_store")
            || eventType is not ("renewed" or "cancelled" or "expired")
            || eventId.Length is < 8 or > 160
            || subscriptionId.Length is < 8 or > 160)
            return Task.FromResult<VerifiedPremiumEvent?>(null);

        var canonical = string.Join('|', provider, eventId, subscriptionId, eventType,
            occurredAt.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture),
            renewsAt?.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture) ?? "");
        var expected = HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(canonical));
        byte[] supplied;
        try { supplied = Convert.FromHexString(signedPayload); }
        catch (FormatException) { return Task.FromResult<VerifiedPremiumEvent?>(null); }
        if (supplied.Length != expected.Length || !CryptographicOperations.FixedTimeEquals(supplied, expected))
            return Task.FromResult<VerifiedPremiumEvent?>(null);
        if (eventType == "renewed" && (!renewsAt.HasValue || renewsAt <= occurredAt))
            return Task.FromResult<VerifiedPremiumEvent?>(null);
        return Task.FromResult<VerifiedPremiumEvent?>(new(provider, eventId, subscriptionId, eventType, occurredAt, renewsAt));
    }
}

public sealed class UnavailablePremiumEventVerifier : IPremiumEventVerifier
{
    public bool IsConfigured => false;
    public Task<VerifiedPremiumEvent?> Verify(string provider, string eventId, string subscriptionId, string eventType, DateTimeOffset occurredAt, DateTimeOffset? renewsAt, string signedPayload, CancellationToken ct)
        => Task.FromResult<VerifiedPremiumEvent?>(null);
}
