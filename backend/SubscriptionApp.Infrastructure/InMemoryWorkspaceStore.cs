using SubscriptionApp.Application;
using SubscriptionApp.Domain;

namespace SubscriptionApp.Infrastructure;

// Development only. Protected by a lock because HTTP requests can execute concurrently.
public sealed class InMemoryWorkspaceStore : IWorkspaceStore
{
    private readonly object gate = new();
    private readonly Dictionary<string, UserProfile> profiles = [];
    private readonly List<BankConnection> connections = [];
    private readonly List<BankAccount> accounts = [];
    private readonly List<BankTransaction> transactions = [];
    private readonly List<RecommendationEvent> events = [];
    private readonly List<AffiliateConversion> affiliateConversions = [];
    private readonly List<Consent> consents = [];
    private readonly List<UserNotification> notifications = [];
    private readonly List<PushDevice> pushDevices = [];
    private readonly List<BankSyncJob> syncJobs = [];
    private readonly List<SubscriptionPreference> subscriptionPreferences = [];
    private readonly List<AuditLog> auditLogs = [];
    private readonly List<PremiumSubscription> premiumSubscriptions = [];
    private readonly List<PremiumWebhookEvent> premiumWebhookEvents = [];
    private readonly List<StoredRecurringPayment> storedPayments = [];
    private readonly List<StoredRecommendation> storedRecommendations = [];

    public Task<UserProfile> Profile(string userId, CancellationToken ct)
    {
        lock (gate)
        {
            if (!profiles.TryGetValue(userId, out var p))
                profiles[userId] = p = new() { Id = userId, FirstName = "Utilisateur" };
            return Task.FromResult(p);
        }
    }

    public Task SaveProfile(UserProfile profile, CancellationToken ct)
    {
        lock (gate)
            profiles[profile.Id] = profile;
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<BankConnection>> Connections(string userId, CancellationToken ct)
    {
        lock (gate)
            return Task.FromResult<IReadOnlyList<BankConnection>>(
                connections.Where(c => c.UserId == userId).ToArray()
            );
    }

    public Task<IReadOnlyList<BankConnection>> ExpiringConnections(
        DateTimeOffset from,
        DateTimeOffset until,
        CancellationToken ct
    )
    {
        lock (gate)
            return Task.FromResult<IReadOnlyList<BankConnection>>(
                connections
                    .Where(c =>
                        c.Status != "revoked"
                        && c.ConsentExpiresAt > from
                        && c.ConsentExpiresAt <= until
                    )
                    .ToArray()
            );
    }

    public Task AddConnection(BankConnection connection, CancellationToken ct)
    {
        lock (gate)
        {
            connections.Add(connection);
            consents.Add(new() { UserId = connection.UserId, SubjectId = connection.Id.ToString() });
        }
        return Task.CompletedTask;
    }

    public Task SetConnectionStatus(BankConnection connection, string status, CancellationToken ct)
    {
        lock (gate) connection.Status = status;
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<BankAccount>> Accounts(string userId, CancellationToken ct)
    {
        lock (gate)
            return Task.FromResult<IReadOnlyList<BankAccount>>(
                accounts.Where(a => a.UserId == userId).ToArray()
            );
    }

    public Task<IReadOnlyList<BankTransaction>> Transactions(string userId, CancellationToken ct)
    {
        lock (gate)
            return Task.FromResult<IReadOnlyList<BankTransaction>>(
                transactions.Where(t => t.UserId == userId).ToArray()
            );
    }

    public Task Synchronize(
        BankConnection connection,
        IReadOnlyList<BankTransaction> rows,
        CancellationToken ct
    )
    {
        lock (gate)
        {
            foreach (var row in rows)
            {
                var account = accounts.FirstOrDefault(a =>
                    a.UserId == row.UserId
                    && a.ConnectionId == connection.Id
                    && a.ExternalAccountId == row.AccountKey
                );
                if (account is null)
                {
                    var suffix = row.AccountKey.Length <= 4 ? row.AccountKey : row.AccountKey[^4..];
                    account = new()
                    {
                        UserId = row.UserId,
                        ConnectionId = connection.Id,
                        ExternalAccountId = row.AccountKey,
                        MaskedName = $"Compte •••• {suffix}",
                    };
                    accounts.Add(account);
                }
                row.AccountId = account.Id;
            }
            var existing = transactions
                .Where(t => t.UserId == connection.UserId && t.ConnectionId == connection.Id)
                .ToDictionary(t => t.ExternalId);
            foreach (var row in rows)
            {
                if (!existing.TryGetValue(row.ExternalId, out var stored))
                {
                    transactions.Add(row);
                    existing.Add(row.ExternalId, row);
                    continue;
                }
                stored.AccountId = row.AccountId;
                stored.AccountKey = row.AccountKey;
                stored.BookedAt = row.BookedAt;
                stored.Amount = row.Amount;
                stored.Currency = row.Currency;
                stored.MerchantName = row.MerchantName;
                stored.Category = row.Category;
            }
            connection.LastSyncAt = DateTimeOffset.UtcNow;
            connection.Status = "connected";
        }
        return Task.CompletedTask;
    }

    public Task RemoveConnection(string userId, Guid id, CancellationToken ct)
    {
        lock (gate)
        {
            connections.RemoveAll(c => c.UserId == userId && c.Id == id);
            accounts.RemoveAll(a => a.UserId == userId && a.ConnectionId == id);
            transactions.RemoveAll(t => t.UserId == userId && t.ConnectionId == id);
            foreach (
                var consent in consents.Where(c =>
                    c.UserId == userId && c.SubjectId == id.ToString() && c.RevokedAt is null
                )
            )
                consent.RevokedAt = DateTimeOffset.UtcNow;
        }
        return Task.CompletedTask;
    }

    public Task AddEvent(RecommendationEvent evt, CancellationToken ct)
    {
        lock (gate)
            events.Add(evt);
        return Task.CompletedTask;
    }

    public Task<RecommendationEvent?> RecommendationEvent(Guid id, CancellationToken ct)
    {
        lock (gate) return Task.FromResult(events.FirstOrDefault(e => e.Id == id));
    }

    public Task<bool> SaveAffiliateConversion(AffiliateConversion conversion, CancellationToken ct)
    {
        lock (gate)
        {
            if (affiliateConversions.Any(c => c.Provider == conversion.Provider && c.ExternalConversionId == conversion.ExternalConversionId)) return Task.FromResult(false);
            affiliateConversions.Add(conversion); return Task.FromResult(true);
        }
    }

    public Task<IReadOnlyList<Consent>> Consents(string userId, CancellationToken ct)
    {
        lock (gate)
            return Task.FromResult<IReadOnlyList<Consent>>(
                consents.Where(c => c.UserId == userId).ToArray()
            );
    }

    public Task<bool> RevokeConsent(string userId, Guid id, CancellationToken ct)
    {
        lock (gate)
        {
            var consent = consents.FirstOrDefault(c => c.UserId == userId && c.Id == id);
            if (consent is null) return Task.FromResult(false);
            consent.RevokedAt ??= DateTimeOffset.UtcNow;
            if (Guid.TryParse(consent.SubjectId, out var connectionId))
            {
                var connection = connections.FirstOrDefault(c =>
                    c.UserId == userId && c.Id == connectionId
                );
                if (connection is not null)
                {
                    connection.Status = "revoked";
                    connection.ConsentExpiresAt = DateTimeOffset.UtcNow;
                }
            }
            return Task.FromResult(true);
        }
    }

    public Task<IReadOnlyList<UserNotification>> Notifications(string userId, CancellationToken ct)
    {
        lock (gate)
            return Task.FromResult<IReadOnlyList<UserNotification>>(
                notifications.Where(n => n.UserId == userId).OrderByDescending(n => n.CreatedAt).ToArray()
            );
    }

    public Task AddNotification(UserNotification notification, CancellationToken ct)
    {
        lock (gate)
            if (!notifications.Any(n => n.UserId == notification.UserId && n.SourceKey == notification.SourceKey))
                notifications.Add(notification);
        return Task.CompletedTask;
    }

    public Task<bool> MarkNotificationRead(string userId, Guid id, CancellationToken ct)
    {
        lock (gate)
        {
            var notification = notifications.FirstOrDefault(n => n.UserId == userId && n.Id == id);
            if (notification is null) return Task.FromResult(false);
            notification.ReadAt ??= DateTimeOffset.UtcNow;
            return Task.FromResult(true);
        }
    }

    public Task<IReadOnlyList<UserNotification>> ClaimPushNotifications(int limit, DateTimeOffset now, TimeSpan lease, CancellationToken ct)
    {
        lock (gate)
        {
            var claimed = notifications
                .Where(n => (n.PushStatus == "pending" || (n.PushStatus == "processing" && n.PushLeaseExpiresAt <= now)) && profiles.TryGetValue(n.UserId, out var p) && p.NotificationsEnabled)
                .OrderBy(n => n.CreatedAt).Take(limit).ToArray();
            foreach (var notification in claimed)
            {
                notification.PushStatus = "processing";
                notification.PushLeaseExpiresAt = now.Add(lease);
            }
            return Task.FromResult<IReadOnlyList<UserNotification>>(claimed);
        }
    }

    public Task MarkPushResult(Guid notificationId, bool delivered, bool retry, DateTimeOffset now, CancellationToken ct)
    {
        lock (gate) { var n = notifications.Single(x => x.Id == notificationId); n.PushAttempts++; n.PushAttemptedAt = now; n.PushStatus = delivered ? "sent" : retry && n.PushAttempts < 5 ? "pending" : "failed"; n.PushLeaseExpiresAt = null; if (delivered) n.PushedAt = now; }
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<PushDevice>> PushDevices(string userId, CancellationToken ct)
    {
        lock (gate)
            return Task.FromResult<IReadOnlyList<PushDevice>>(pushDevices.Where(d => d.UserId == userId && d.Active).ToArray());
    }

    public Task<PushDevice> SavePushDevice(PushDevice device, CancellationToken ct)
    {
        lock (gate)
        {
            var existing = pushDevices.FirstOrDefault(d => d.UserId == device.UserId && d.Token == device.Token);
            if (existing is null) pushDevices.Add(device);
            else
            {
                existing.Platform = device.Platform;
                existing.LastSeenAt = device.LastSeenAt;
                existing.Active = true;
                device = existing;
            }
            return Task.FromResult(device);
        }
    }

    public Task<bool> RemovePushDevice(string userId, Guid id, CancellationToken ct)
    {
        lock (gate) return Task.FromResult(pushDevices.RemoveAll(d => d.UserId == userId && d.Id == id) > 0);
    }

    public Task DeactivatePushDevice(Guid id, CancellationToken ct)
    {
        lock (gate) { var device = pushDevices.FirstOrDefault(d => d.Id == id); if (device is not null) device.Active = false; }
        return Task.CompletedTask;
    }

    public Task<BankSyncJob> EnqueueSync(BankSyncJob job, CancellationToken ct)
    {
        lock (gate) { syncJobs.Add(job); return Task.FromResult(job); }
    }

    public Task<BankSyncJob?> SyncJob(string userId, Guid id, CancellationToken ct)
    {
        lock (gate) return Task.FromResult(syncJobs.FirstOrDefault(j => j.UserId == userId && j.Id == id));
    }

    public Task<BankSyncJob?> ClaimSyncJob(DateTimeOffset now, TimeSpan lease, CancellationToken ct)
    {
        lock (gate)
        {
            var job = syncJobs.OrderBy(j => j.CreatedAt).FirstOrDefault(j => j.Status == "queued" || (j.Status == "running" && j.LeaseExpiresAt <= now));
            if (job is null) return Task.FromResult<BankSyncJob?>(null);
            job.Status = "running"; job.Attempts++; job.UpdatedAt = now; job.LeaseExpiresAt = now.Add(lease);
            return Task.FromResult<BankSyncJob?>(job);
        }
    }

    public Task CompleteSyncJob(Guid id, int transactionCount, DateTimeOffset now, CancellationToken ct)
    {
        lock (gate) { var job = syncJobs.Single(j => j.Id == id); job.Status = "completed"; job.TransactionCount = transactionCount; job.UpdatedAt = now; job.LeaseExpiresAt = null; }
        return Task.CompletedTask;
    }

    public Task FailSyncJob(Guid id, string errorCode, bool retry, DateTimeOffset now, CancellationToken ct)
    {
        lock (gate) { var job = syncJobs.Single(j => j.Id == id); job.Status = retry ? "queued" : "failed"; job.ErrorCode = errorCode; job.UpdatedAt = now; job.LeaseExpiresAt = null; }
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<SubscriptionPreference>> SubscriptionPreferences(
        string userId,
        CancellationToken ct
    )
    {
        lock (gate)
            return Task.FromResult<IReadOnlyList<SubscriptionPreference>>(
                subscriptionPreferences.Where(p => p.UserId == userId).ToArray()
            );
    }

    public Task SaveSubscriptionPreference(
        SubscriptionPreference preference,
        CancellationToken ct
    )
    {
        lock (gate)
        {
            var existing = subscriptionPreferences.FirstOrDefault(p =>
                p.UserId == preference.UserId && p.SubscriptionId == preference.SubscriptionId
            );
            if (existing is null)
                subscriptionPreferences.Add(preference);
            else
            {
                existing.Category = preference.Category;
                existing.Status = preference.Status;
                existing.UpdatedAt = preference.UpdatedAt;
            }
        }
        return Task.CompletedTask;
    }

    public Task<UserDataExport> ExportData(string userId, CancellationToken ct)
    {
        lock (gate)
        {
            if (!profiles.TryGetValue(userId, out var profile))
                profiles[userId] = profile = new() { Id = userId, FirstName = "Utilisateur" };
            return Task.FromResult(
                new UserDataExport(
                    DateTimeOffset.UtcNow,
                    profile,
                    connections.Where(c => c.UserId == userId).ToArray(),
                    accounts.Where(a => a.UserId == userId).ToArray(),
                    transactions.Where(t => t.UserId == userId).ToArray(),
                    consents.Where(c => c.UserId == userId).ToArray(),
                    notifications.Where(n => n.UserId == userId).ToArray(),
                    pushDevices.Where(d => d.UserId == userId).ToArray(),
                    syncJobs.Where(j => j.UserId == userId).ToArray(),
                    subscriptionPreferences.Where(p => p.UserId == userId).ToArray(),
                    events.Where(e => e.UserId == userId).ToArray(),
                    affiliateConversions.Where(x => x.UserId == userId).ToArray(),
                    auditLogs.Where(a => a.UserId == userId).ToArray(),
                    premiumSubscriptions
                        .Where(p => p.UserId == userId)
                        .OrderByDescending(p => p.UpdatedAt)
                        .FirstOrDefault(),
                    premiumWebhookEvents.Where(e => e.UserId == userId).ToArray(),
                    storedPayments.Where(p => p.UserId == userId).ToArray(),
                    storedRecommendations.Where(r => r.UserId == userId).ToArray()
                )
            );
        }
    }

    public Task AddAudit(AuditLog audit, CancellationToken ct)
    {
        lock (gate)
            auditLogs.Add(audit);
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<AuditLog>> AuditLogs(string userId, CancellationToken ct)
    {
        lock (gate)
            return Task.FromResult<IReadOnlyList<AuditLog>>(
                auditLogs.Where(a => a.UserId == userId).OrderByDescending(a => a.CreatedAt).ToArray()
            );
    }

    public Task<PremiumSubscription?> Premium(string userId, CancellationToken ct)
    {
        lock (gate)
            return Task.FromResult(
                premiumSubscriptions
                    .Where(p => p.UserId == userId)
                    .OrderByDescending(p => p.UpdatedAt)
                    .FirstOrDefault()
            );
    }

    public Task<bool> SavePremium(PremiumSubscription subscription, CancellationToken ct)
    {
        lock (gate)
        {
            if (
                premiumSubscriptions.Any(p =>
                    p.Provider == subscription.Provider
                    && p.ExternalSubscriptionId == subscription.ExternalSubscriptionId
                )
            )
                return Task.FromResult(false);
            foreach (var existing in premiumSubscriptions.Where(p => p.UserId == subscription.UserId))
                existing.Status = "replaced";
            premiumSubscriptions.Add(subscription);
            return Task.FromResult(true);
        }
    }

    public Task<bool> ApplyPremiumEvent(PremiumWebhookEvent webhookEvent, DateTimeOffset? renewsAt, CancellationToken ct)
    {
        lock (gate)
        {
            if (premiumWebhookEvents.Any(e => e.Provider == webhookEvent.Provider && e.ExternalEventId == webhookEvent.ExternalEventId))
                return Task.FromResult(false);
            var subscription = premiumSubscriptions.SingleOrDefault(p => p.Provider == webhookEvent.Provider && p.ExternalSubscriptionId == webhookEvent.ExternalSubscriptionId);
            if (subscription is null) return Task.FromResult(false);
            if (webhookEvent.OccurredAt < subscription.UpdatedAt) return Task.FromResult(false);
            subscription.Status = webhookEvent.EventType == "renewed" ? "active" : webhookEvent.EventType;
            if (renewsAt.HasValue) subscription.RenewsAt = renewsAt.Value;
            subscription.UpdatedAt = webhookEvent.OccurredAt;
            webhookEvent.UserId = subscription.UserId;
            premiumWebhookEvents.Add(webhookEvent);
            return Task.FromResult(true);
        }
    }

    public Task SaveAnalysis(
        string userId,
        IReadOnlyList<Payment> payments,
        IReadOnlyList<Recommendation> recommendations,
        CancellationToken ct
    )
    {
        lock (gate)
        {
            storedPayments.RemoveAll(p => p.UserId == userId);
            storedRecommendations.RemoveAll(r => r.UserId == userId);
            storedPayments.AddRange(
                payments.Select(p => new StoredRecurringPayment
                {
                    Id = p.Id,
                    UserId = userId,
                    Merchant = p.Merchant,
                    Category = p.Category,
                    Cadence = p.Cadence,
                    AverageAmount = p.Amount,
                    MonthlyCost = p.MonthlyCost,
                    Confidence = p.Confidence,
                    FirstSeenAt = p.FirstSeenAt,
                    LastSeenAt = p.LastSeenAt,
                    NextPaymentAt = p.NextPaymentAt,
                })
            );
            storedRecommendations.AddRange(
                recommendations.Select(r => new StoredRecommendation
                {
                    Id = r.Id,
                    UserId = userId,
                    SubscriptionId = r.SubscriptionId,
                    Category = r.Category,
                    CurrentCost = r.CurrentCost,
                    SuggestedCost = r.SuggestedCost,
                    AnnualSaving = r.AnnualSaving,
                    Confidence = r.Confidence,
                    Explanation = r.Explanation,
                    Assumptions = r.Assumptions,
                    OfferId = r.Offer.Id,
                })
            );
        }
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<StoredRecurringPayment>> StoredPayments(
        string userId,
        CancellationToken ct
    )
    {
        lock (gate)
            return Task.FromResult<IReadOnlyList<StoredRecurringPayment>>(
                storedPayments.Where(p => p.UserId == userId).ToArray()
            );
    }

    public Task<IReadOnlyList<StoredRecommendation>> StoredRecommendations(
        string userId,
        CancellationToken ct
    )
    {
        lock (gate)
            return Task.FromResult<IReadOnlyList<StoredRecommendation>>(
                storedRecommendations.Where(r => r.UserId == userId).ToArray()
            );
    }

    public Task DeleteAccount(string userId, CancellationToken ct)
    {
        lock (gate)
        {
            profiles.Remove(userId);
            connections.RemoveAll(c => c.UserId == userId);
            accounts.RemoveAll(a => a.UserId == userId);
            transactions.RemoveAll(t => t.UserId == userId);
            events.RemoveAll(e => e.UserId == userId);
            affiliateConversions.RemoveAll(c => c.UserId == userId);
            consents.RemoveAll(c => c.UserId == userId);
            notifications.RemoveAll(n => n.UserId == userId);
            pushDevices.RemoveAll(d => d.UserId == userId);
            syncJobs.RemoveAll(j => j.UserId == userId);
            subscriptionPreferences.RemoveAll(p => p.UserId == userId);
            auditLogs.RemoveAll(a => a.UserId == userId);
            premiumSubscriptions.RemoveAll(p => p.UserId == userId);
            premiumWebhookEvents.RemoveAll(e => e.UserId == userId);
            storedPayments.RemoveAll(p => p.UserId == userId);
            storedRecommendations.RemoveAll(r => r.UserId == userId);
        }
        return Task.CompletedTask;
    }

    public Task<int> PurgeExpiredData(DateTimeOffset now, CancellationToken ct)
    {
        lock (gate)
        {
            var count = notifications.RemoveAll(n => n.CreatedAt < now.AddYears(-2));
            count += auditLogs.RemoveAll(a => a.CreatedAt < now.AddYears(-2));
            count += syncJobs.RemoveAll(j => j.UpdatedAt < now.AddDays(-90) && j.Status is "completed" or "failed");
            return Task.FromResult(count);
        }
    }
}
