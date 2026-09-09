using SubscriptionApp.Application;
using SubscriptionApp.Domain;

namespace SubscriptionApp.Infrastructure;

public sealed class ConsentExpiryProcessor(IWorkspaceStore store, TimeProvider time)
{
    public async Task<int> RunOnce(CancellationToken ct)
    {
        var now = time.GetUtcNow();
        var expiring = await store.ExpiringConnections(now, now.AddDays(7), ct);
        var created = 0;
        foreach (var connection in expiring)
        {
            var profile = await store.Profile(connection.UserId, ct);
            if (!profile.NotificationsEnabled) continue;
            await store.AddNotification(
                new UserNotification
                {
                    UserId = connection.UserId,
                    Type = "consent_expiring",
                    Title = "Connexion bancaire à renouveler",
                    Body = $"L’autorisation pour {connection.BankName} expire bientôt.",
                    ResourceId = connection.Id.ToString(),
                    SourceKey = $"consent-expiring:{connection.Id}:{connection.ConsentExpiresAt:yyyy-MM-dd}",
                },
                ct
            );
            created++;
        }
        return created;
    }
}
