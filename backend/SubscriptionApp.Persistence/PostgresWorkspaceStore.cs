using Microsoft.EntityFrameworkCore;
using Npgsql;
using SubscriptionApp.Application;
using SubscriptionApp.Domain;

namespace SubscriptionApp.Persistence;

public sealed class PostgresWorkspaceStore(WorkspaceDbContext db) : IWorkspaceStore
{
    private static bool IsUniqueViolation(DbUpdateException exception) =>
        exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };

    public async Task<UserProfile> Profile(string userId, CancellationToken ct)
    {
        var p = await db.Profiles.FindAsync([userId], ct);
        if (p is not null)
            return p;
        p = new() { Id = userId, FirstName = "Utilisateur" };
        db.Profiles.Add(p);
        try
        {
            await db.SaveChangesAsync(ct);
            return p;
        }
        catch (DbUpdateException exception) when (IsUniqueViolation(exception))
        {
            db.ChangeTracker.Clear();
            return await db.Profiles.SingleAsync(profile => profile.Id == userId, ct);
        }
    }

    public async Task SaveProfile(UserProfile profile, CancellationToken ct)
    {
        db.Profiles.Update(profile);
        await db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<BankConnection>> Connections(
        string userId,
        CancellationToken ct
    ) => await db.Connections.Where(c => c.UserId == userId).ToListAsync(ct);

    public async Task<BankConnection?> ConnectionByProviderReference(string provider, string externalId, CancellationToken ct) =>
        await db.Connections.SingleOrDefaultAsync(c => c.Provider == provider && c.ExternalConnectionId == externalId, ct);

    public async Task<IReadOnlyList<BankConnection>> ExpiringConnections(
        DateTimeOffset from,
        DateTimeOffset until,
        CancellationToken ct
    ) =>
        await db.Connections.AsNoTracking()
            .Where(c =>
                c.Status != "revoked"
                && c.ConsentExpiresAt > from
                && c.ConsentExpiresAt <= until
            )
            .ToListAsync(ct);

    public async Task AddConnection(BankConnection connection, CancellationToken ct)
    {
        await Profile(connection.UserId, ct);
        db.Connections.Add(connection);
        db.Consents.Add(new() { UserId = connection.UserId, SubjectId = connection.Id.ToString() });
        await db.SaveChangesAsync(ct);
    }

    public async Task SetConnectionStatus(BankConnection connection, string status, CancellationToken ct)
    {
        connection.Status = status;
        await db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<BankAccount>> Accounts(string userId, CancellationToken ct) =>
        await db.Accounts.AsNoTracking().Where(a => a.UserId == userId).ToListAsync(ct);

    public async Task<IReadOnlyList<BankTransaction>> Transactions(
        string userId,
        CancellationToken ct
    ) => await db.Transactions.AsNoTracking().Where(t => t.UserId == userId).ToListAsync(ct);

    public async Task Synchronize(
        BankConnection connection,
        IReadOnlyList<BankTransaction> rows,
        CancellationToken ct
    )
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        // Serialize writes for this connection across API instances, then deduplicate provider IDs.
        await db.Database.ExecuteSqlInterpolatedAsync(
            $"SELECT pg_advisory_xact_lock(hashtext({connection.Id.ToString()}))",
            ct
        );
        var existing = await db.Transactions
            .Where(t => t.UserId == connection.UserId && t.ConnectionId == connection.Id)
            .ToDictionaryAsync(t => t.ExternalId, ct);
        var knownAccounts = await db.Accounts
            .Where(a => a.UserId == connection.UserId && a.ConnectionId == connection.Id)
            .ToDictionaryAsync(a => a.ExternalAccountId, ct);
        foreach (var row in rows)
        {
            if (!knownAccounts.TryGetValue(row.AccountKey, out var account))
            {
                var suffix = row.AccountKey.Length <= 4 ? row.AccountKey : row.AccountKey[^4..];
                account = new()
                {
                    UserId = row.UserId,
                    ConnectionId = connection.Id,
                    ExternalAccountId = row.AccountKey,
                    MaskedName = $"Compte •••• {suffix}",
                };
                knownAccounts.Add(row.AccountKey, account);
                db.Accounts.Add(account);
            }
            row.AccountId = account.Id;
        }
        foreach (var row in rows)
        {
            if (!existing.TryGetValue(row.ExternalId, out var stored))
            {
                db.Transactions.Add(row);
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
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }

    public async Task RemoveConnection(string userId, Guid id, CancellationToken ct)
    {
        await db.Consents
            .Where(c => c.UserId == userId && c.SubjectId == id.ToString() && c.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(c => c.RevokedAt, DateTimeOffset.UtcNow), ct);
        await db.Connections.Where(c => c.UserId == userId && c.Id == id).ExecuteDeleteAsync(ct);
    }

    public async Task AddEvent(RecommendationEvent evt, CancellationToken ct)
    {
        db.Events.Add(evt);
        await db.SaveChangesAsync(ct);
    }

    public async Task<RecommendationEvent?> RecommendationEvent(Guid id, CancellationToken ct) =>
        await db.Events.AsNoTracking().FirstOrDefaultAsync(e => e.Id == id, ct);

    public async Task<bool> SaveAffiliateConversion(AffiliateConversion conversion, CancellationToken ct)
    {
        if (await db.AffiliateConversions.AnyAsync(c => c.Provider == conversion.Provider && c.ExternalConversionId == conversion.ExternalConversionId, ct)) return false;
        db.AffiliateConversions.Add(conversion);
        try { await db.SaveChangesAsync(ct); return true; }
        catch (DbUpdateException exception) when (IsUniqueViolation(exception)) { db.ChangeTracker.Clear(); return false; }
    }

    public async Task<IReadOnlyList<Consent>> Consents(string userId, CancellationToken ct) =>
        await db.Consents.AsNoTracking().Where(c => c.UserId == userId).ToListAsync(ct);

    public async Task<bool> RevokeConsent(string userId, Guid id, CancellationToken ct)
    {
        var consent = await db.Consents.FirstOrDefaultAsync(c => c.UserId == userId && c.Id == id, ct);
        if (consent is null) return false;
        consent.RevokedAt ??= DateTimeOffset.UtcNow;
        if (Guid.TryParse(consent.SubjectId, out var connectionId))
        {
            var connection = await db.Connections.FirstOrDefaultAsync(
                c => c.UserId == userId && c.Id == connectionId,
                ct
            );
            if (connection is not null)
            {
                connection.Status = "revoked";
                connection.ConsentExpiresAt = DateTimeOffset.UtcNow;
            }
        }
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<IReadOnlyList<UserNotification>> Notifications(
        string userId,
        CancellationToken ct
    ) =>
        await db.Notifications.AsNoTracking()
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync(ct);

    public async Task AddNotification(UserNotification notification, CancellationToken ct)
    {
        if (await db.Notifications.AnyAsync(n => n.UserId == notification.UserId && n.SourceKey == notification.SourceKey, ct))
            return;
        db.Notifications.Add(notification);
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException exception) when (IsUniqueViolation(exception)) { db.ChangeTracker.Clear(); }
    }

    public async Task<bool> MarkNotificationRead(string userId, Guid id, CancellationToken ct)
    {
        var notification = await db.Notifications.FirstOrDefaultAsync(
            n => n.UserId == userId && n.Id == id,
            ct
        );
        if (notification is null) return false;
        notification.ReadAt ??= DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<IReadOnlyList<UserNotification>> ClaimPushNotifications(int limit, DateTimeOffset now, TimeSpan lease, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var claimed = await db.Notifications.FromSqlInterpolated($"SELECT n.* FROM notifications n JOIN user_profiles p ON p.\"Id\" = n.\"UserId\" WHERE p.\"NotificationsEnabled\" = TRUE AND (n.\"PushStatus\" = 'pending' OR (n.\"PushStatus\" = 'processing' AND n.\"PushLeaseExpiresAt\" <= {now})) ORDER BY n.\"CreatedAt\" LIMIT {limit} FOR UPDATE OF n SKIP LOCKED").ToListAsync(ct);
        foreach (var notification in claimed) { notification.PushStatus = "processing"; notification.PushLeaseExpiresAt = now.Add(lease); }
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return claimed;
    }

    public async Task MarkPushResult(Guid notificationId, bool delivered, bool retry, DateTimeOffset now, CancellationToken ct)
    {
        var n = await db.Notifications.SingleAsync(x => x.Id == notificationId, ct); n.PushAttempts++; n.PushAttemptedAt = now;
        n.PushStatus = delivered ? "sent" : retry && n.PushAttempts < 5 ? "pending" : "failed"; n.PushLeaseExpiresAt = null; if (delivered) n.PushedAt = now;
        await db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<PushDevice>> PushDevices(string userId, CancellationToken ct) =>
        await db.PushDevices.AsNoTracking().Where(d => d.UserId == userId && d.Active).OrderByDescending(d => d.LastSeenAt).ToListAsync(ct);

    public async Task<PushDevice> SavePushDevice(PushDevice device, CancellationToken ct)
    {
        var existing = await db.PushDevices.FirstOrDefaultAsync(d => d.UserId == device.UserId && d.Token == device.Token, ct);
        if (existing is null) db.PushDevices.Add(device);
        else
        {
            existing.Platform = device.Platform;
            existing.LastSeenAt = device.LastSeenAt;
            existing.Active = true;
            device = existing;
        }
        try { await db.SaveChangesAsync(ct); return device; }
        catch (DbUpdateException exception) when (IsUniqueViolation(exception))
        {
            db.ChangeTracker.Clear();
            return await db.PushDevices.SingleAsync(d => d.UserId == device.UserId && d.Token == device.Token, ct);
        }
    }

    public async Task<bool> RemovePushDevice(string userId, Guid id, CancellationToken ct) =>
        await db.PushDevices.Where(d => d.UserId == userId && d.Id == id).ExecuteDeleteAsync(ct) > 0;

    public async Task DeactivatePushDevice(Guid id, CancellationToken ct) =>
        _ = await db.PushDevices.Where(d => d.Id == id).ExecuteUpdateAsync(s => s.SetProperty(d => d.Active, false), ct);

    public async Task<BankSyncJob> EnqueueSync(BankSyncJob job, CancellationToken ct)
    {
        db.SyncJobs.Add(job);
        await db.SaveChangesAsync(ct);
        return job;
    }

    public async Task<BankSyncJob?> SyncJob(string userId, Guid id, CancellationToken ct) =>
        await db.SyncJobs.AsNoTracking().FirstOrDefaultAsync(j => j.UserId == userId && j.Id == id, ct);

    public async Task<BankSyncJob?> ClaimSyncJob(DateTimeOffset now, TimeSpan lease, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var job = await db.SyncJobs
            .FromSqlInterpolated($"SELECT * FROM bank_sync_jobs WHERE \"Status\" = 'queued' OR (\"Status\" = 'running' AND \"LeaseExpiresAt\" <= {now}) ORDER BY \"CreatedAt\" LIMIT 1 FOR UPDATE SKIP LOCKED")
            .FirstOrDefaultAsync(ct);
        if (job is not null)
        {
            job.Status = "running"; job.Attempts++; job.UpdatedAt = now; job.LeaseExpiresAt = now.Add(lease);
            await db.SaveChangesAsync(ct);
        }
        await transaction.CommitAsync(ct);
        return job;
    }

    public async Task CompleteSyncJob(Guid id, int transactionCount, DateTimeOffset now, CancellationToken ct) =>
        _ = await db.SyncJobs.Where(j => j.Id == id).ExecuteUpdateAsync(s => s
            .SetProperty(j => j.Status, "completed").SetProperty(j => j.TransactionCount, transactionCount)
            .SetProperty(j => j.ErrorCode, (string?)null).SetProperty(j => j.UpdatedAt, now)
            .SetProperty(j => j.LeaseExpiresAt, (DateTimeOffset?)null), ct);

    public async Task FailSyncJob(Guid id, string errorCode, bool retry, DateTimeOffset now, CancellationToken ct) =>
        _ = await db.SyncJobs.Where(j => j.Id == id).ExecuteUpdateAsync(s => s
            .SetProperty(j => j.Status, retry ? "queued" : "failed").SetProperty(j => j.ErrorCode, errorCode)
            .SetProperty(j => j.UpdatedAt, now).SetProperty(j => j.LeaseExpiresAt, (DateTimeOffset?)null), ct);

    public async Task<IReadOnlyList<SubscriptionPreference>> SubscriptionPreferences(
        string userId,
        CancellationToken ct
    ) =>
        await db.SubscriptionPreferences.AsNoTracking()
            .Where(p => p.UserId == userId)
            .ToListAsync(ct);

    public async Task SaveSubscriptionPreference(
        SubscriptionPreference preference,
        CancellationToken ct
    )
    {
        var existing = await db.SubscriptionPreferences.FirstOrDefaultAsync(
            p => p.UserId == preference.UserId && p.SubscriptionId == preference.SubscriptionId,
            ct
        );
        if (existing is null)
            db.SubscriptionPreferences.Add(preference);
        else
        {
            existing.Category = preference.Category;
            existing.Status = preference.Status;
            existing.UpdatedAt = preference.UpdatedAt;
        }
        await db.SaveChangesAsync(ct);
    }

    public async Task<UserDataExport> ExportData(string userId, CancellationToken ct)
    {
        var profile = await Profile(userId, ct);
        var connections = await Connections(userId, ct);
        var accounts = await Accounts(userId, ct);
        var transactions = await Transactions(userId, ct);
        var consents = await Consents(userId, ct);
        var notifications = await Notifications(userId, ct);
        var pushDevices = await PushDevices(userId, ct);
        var syncJobs = await db.SyncJobs.AsNoTracking().Where(j => j.UserId == userId).ToListAsync(ct);
        var preferences = await SubscriptionPreferences(userId, ct);
        var events = await db.Events.AsNoTracking().Where(e => e.UserId == userId).ToListAsync(ct);
        var conversions = await db.AffiliateConversions.AsNoTracking().Where(e => e.UserId == userId).ToListAsync(ct);
        var audits = await AuditLogs(userId, ct);
        var premium = await Premium(userId, ct);
        var premiumEvents = await db.PremiumWebhookEvents.AsNoTracking().Where(e => e.UserId == userId).ToListAsync(ct);
        var storedPayments = await StoredPayments(userId, ct);
        var storedRecommendations = await StoredRecommendations(userId, ct);
        return new(
            DateTimeOffset.UtcNow,
            profile,
            connections,
            accounts,
            transactions,
            consents,
            notifications,
            pushDevices,
            syncJobs,
            preferences,
            events,
            conversions,
            audits,
            premium,
            premiumEvents,
            storedPayments,
            storedRecommendations
        );
    }

    public async Task AddAudit(AuditLog audit, CancellationToken ct)
    {
        db.AuditLogs.Add(audit);
        await db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<AuditLog>> AuditLogs(string userId, CancellationToken ct) =>
        await db.AuditLogs.AsNoTracking()
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync(ct);

    public async Task<PremiumSubscription?> Premium(string userId, CancellationToken ct) =>
        await db.PremiumSubscriptions.AsNoTracking()
            .Where(p => p.UserId == userId)
            .OrderByDescending(p => p.UpdatedAt)
            .FirstOrDefaultAsync(ct);

    public async Task<bool> SavePremium(PremiumSubscription subscription, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        if (
            await db.PremiumSubscriptions.AnyAsync(
                p =>
                    p.Provider == subscription.Provider
                    && p.ExternalSubscriptionId == subscription.ExternalSubscriptionId,
                ct
            )
        )
        {
            await transaction.RollbackAsync(ct);
            return false;
        }
        await db.PremiumSubscriptions
            .Where(p => p.UserId == subscription.UserId && p.Status == "active")
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.Status, "replaced"), ct);
        db.PremiumSubscriptions.Add(subscription);
        try
        {
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            return true;
        }
        catch (DbUpdateException exception) when (IsUniqueViolation(exception))
        {
            await transaction.RollbackAsync(ct);
            db.ChangeTracker.Clear();
            return false;
        }
    }

    public async Task<bool> ApplyPremiumEvent(PremiumWebhookEvent webhookEvent, DateTimeOffset? renewsAt, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        if (await db.PremiumWebhookEvents.AnyAsync(e => e.Provider == webhookEvent.Provider && e.ExternalEventId == webhookEvent.ExternalEventId, ct))
            return false;
        var subscription = await db.PremiumSubscriptions.SingleOrDefaultAsync(p => p.Provider == webhookEvent.Provider && p.ExternalSubscriptionId == webhookEvent.ExternalSubscriptionId, ct);
        if (subscription is null || webhookEvent.OccurredAt < subscription.UpdatedAt) return false;
        subscription.Status = webhookEvent.EventType == "renewed" ? "active" : webhookEvent.EventType;
        if (renewsAt.HasValue) subscription.RenewsAt = renewsAt.Value;
        subscription.UpdatedAt = webhookEvent.OccurredAt;
        webhookEvent.UserId = subscription.UserId;
        db.PremiumWebhookEvents.Add(webhookEvent);
        try
        {
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            return true;
        }
        catch (DbUpdateException exception) when (IsUniqueViolation(exception))
        {
            await transaction.RollbackAsync(ct);
            db.ChangeTracker.Clear();
            return false;
        }
    }

    public async Task SaveAnalysis(
        string userId,
        IReadOnlyList<Payment> payments,
        IReadOnlyList<Recommendation> recommendations,
        CancellationToken ct
    )
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        await db.StoredRecommendations.Where(r => r.UserId == userId).ExecuteDeleteAsync(ct);
        await db.StoredPayments.Where(p => p.UserId == userId).ExecuteDeleteAsync(ct);
        var computedAt = DateTimeOffset.UtcNow;
        db.StoredPayments.AddRange(
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
                ComputedAt = computedAt,
            })
        );
        db.StoredRecommendations.AddRange(
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
                ComputedAt = computedAt,
            })
        );
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }

    public async Task<IReadOnlyList<StoredRecurringPayment>> StoredPayments(
        string userId,
        CancellationToken ct
    ) => await db.StoredPayments.AsNoTracking().Where(p => p.UserId == userId).ToListAsync(ct);

    public async Task<IReadOnlyList<StoredRecommendation>> StoredRecommendations(
        string userId,
        CancellationToken ct
    ) => await db.StoredRecommendations.AsNoTracking().Where(r => r.UserId == userId).ToListAsync(ct);

    public async Task DeleteAccount(string userId, CancellationToken ct) =>
        await db.Profiles.Where(p => p.Id == userId).ExecuteDeleteAsync(ct);

    public async Task<int> PurgeExpiredData(DateTimeOffset now, CancellationToken ct)
    {
        var count = await db.IdempotencyRecords.Where(r => r.ExpiresAt <= now).ExecuteDeleteAsync(ct);
        count += await db.Notifications.Where(n => n.CreatedAt < now.AddYears(-2)).ExecuteDeleteAsync(ct);
        count += await db.AuditLogs.Where(a => a.CreatedAt < now.AddYears(-2)).ExecuteDeleteAsync(ct);
        count += await db.SyncJobs.Where(j => j.UpdatedAt < now.AddDays(-90) && (j.Status == "completed" || j.Status == "failed")).ExecuteDeleteAsync(ct);
        return count;
    }
}
