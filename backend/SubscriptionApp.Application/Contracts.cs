using SubscriptionApp.Domain;

namespace SubscriptionApp.Application;

public interface IWorkspaceStore
{
    Task<UserProfile> Profile(string userId, CancellationToken ct);
    Task SaveProfile(UserProfile profile, CancellationToken ct);
    Task<IReadOnlyList<BankConnection>> Connections(string userId, CancellationToken ct);
    Task<BankConnection?> ConnectionByProviderReference(string provider, string externalId, CancellationToken ct);
    Task<IReadOnlyList<BankConnection>> ExpiringConnections(
        DateTimeOffset from,
        DateTimeOffset until,
        CancellationToken ct
    );
    Task AddConnection(BankConnection connection, CancellationToken ct);
    Task SetConnectionStatus(BankConnection connection, string status, CancellationToken ct);
    Task<IReadOnlyList<BankAccount>> Accounts(string userId, CancellationToken ct);
    Task<IReadOnlyList<BankTransaction>> Transactions(string userId, CancellationToken ct);
    Task Synchronize(
        BankConnection connection,
        IReadOnlyList<BankTransaction> transactions,
        CancellationToken ct
    );
    Task RemoveConnection(string userId, Guid id, CancellationToken ct);
    Task AddEvent(RecommendationEvent evt, CancellationToken ct);
    Task<RecommendationEvent?> RecommendationEvent(Guid id, CancellationToken ct);
    Task<IReadOnlyList<RecommendationEvent>> RecommendationEvents(string userId, string? eventType, CancellationToken ct);
    Task<bool> SaveAffiliateConversion(AffiliateConversion conversion, CancellationToken ct);
    Task<IReadOnlyList<Consent>> Consents(string userId, CancellationToken ct);
    Task<Consent> SaveConsent(Consent consent, CancellationToken ct);
    Task<bool> RevokeConsent(string userId, Guid id, CancellationToken ct);
    Task<IReadOnlyList<UserNotification>> Notifications(string userId, CancellationToken ct);
    Task AddNotification(UserNotification notification, CancellationToken ct);
    Task<bool> MarkNotificationRead(string userId, Guid id, CancellationToken ct);
    Task<IReadOnlyList<UserNotification>> ClaimPushNotifications(int limit, DateTimeOffset now, TimeSpan lease, CancellationToken ct);
    Task MarkPushResult(Guid notificationId, bool delivered, bool retry, DateTimeOffset now, CancellationToken ct);
    Task<IReadOnlyList<PushDevice>> PushDevices(string userId, CancellationToken ct);
    Task<PushDevice> SavePushDevice(PushDevice device, CancellationToken ct);
    Task<bool> RemovePushDevice(string userId, Guid id, CancellationToken ct);
    Task DeactivatePushDevice(Guid id, CancellationToken ct);
    Task AddPushReceipt(PushReceipt receipt, CancellationToken ct);
    Task<IReadOnlyList<PushReceipt>> ClaimPushReceipts(int limit, DateTimeOffset now, TimeSpan lease, CancellationToken ct);
    Task CompletePushReceipt(Guid id, string status, string? error, DateTimeOffset now, CancellationToken ct);
    Task<BankSyncJob> EnqueueSync(BankSyncJob job, CancellationToken ct);
    Task<BankSyncJob?> SyncJob(string userId, Guid id, CancellationToken ct);
    Task<BankSyncJob?> ClaimSyncJob(DateTimeOffset now, TimeSpan lease, CancellationToken ct);
    Task CompleteSyncJob(Guid id, int transactionCount, DateTimeOffset now, CancellationToken ct);
    Task FailSyncJob(Guid id, string errorCode, bool retry, DateTimeOffset now, CancellationToken ct);
    Task<IReadOnlyList<SubscriptionPreference>> SubscriptionPreferences(
        string userId,
        CancellationToken ct
    );
    Task SaveSubscriptionPreference(SubscriptionPreference preference, CancellationToken ct);
    Task<UserDataExport> ExportData(string userId, CancellationToken ct);
    Task AddAudit(AuditLog audit, CancellationToken ct);
    Task<IReadOnlyList<AuditLog>> AuditLogs(string userId, CancellationToken ct);
    Task<PremiumSubscription?> Premium(string userId, CancellationToken ct);
    Task<bool> SavePremium(PremiumSubscription subscription, CancellationToken ct);
    Task<bool> ApplyPremiumEvent(PremiumWebhookEvent webhookEvent, DateTimeOffset? renewsAt, CancellationToken ct);
    Task SaveAnalysis(
        string userId,
        IReadOnlyList<Payment> payments,
        IReadOnlyList<Recommendation> recommendations,
        CancellationToken ct
    );
    Task<IReadOnlyList<StoredRecurringPayment>> StoredPayments(string userId, CancellationToken ct);
    Task<IReadOnlyList<StoredRecommendation>> StoredRecommendations(string userId, CancellationToken ct);
    Task<AccountDeletionJob> EnqueueAccountDeletion(string userId, DateTimeOffset now, CancellationToken ct);
    Task<AccountDeletionJob?> AccountDeletion(string userId, CancellationToken ct);
    Task<AccountDeletionJob?> ClaimAccountDeletion(DateTimeOffset now, TimeSpan lease, CancellationToken ct);
    Task CompleteAccountDeletion(Guid id, string status, DateTimeOffset now, CancellationToken ct);
    Task FailAccountDeletion(Guid id, string error, DateTimeOffset now, CancellationToken ct);
    Task DeleteAccount(string userId, CancellationToken ct);
    Task<int> PurgeExpiredData(DateTimeOffset now, CancellationToken ct);
}

public interface IBankingProvider
{
    bool IsConfigured { get; }
    IReadOnlySet<string> SupportedBanks { get; }
    Task<BankConnection> CreateConnection(
        string userId,
        string bankName,
        CancellationToken ct
    );
    Task<IReadOnlyList<BankTransaction>> FetchTransactions(
        BankConnection connection,
        CancellationToken ct
    );
    Task RevokeConnection(BankConnection connection, CancellationToken ct);
}

public interface IOfferCatalog
{
    Task<IReadOnlyList<Offer>> GetOffers(CancellationToken ct);
    Task<Offer> SaveOffer(Offer offer, CancellationToken ct);
    Task<bool> DeactivateOffer(string id, CancellationToken ct);
}

public sealed record VerifiedPurchase(string Provider, string TransactionId, string Plan, DateTimeOffset RenewsAt);

public interface IPremiumPurchaseVerifier
{
    bool IsConfigured { get; }
    Task<VerifiedPurchase?> Verify(
        string userId,
        string provider,
        string productId,
        string transactionId,
        string signedPayload,
        CancellationToken ct
    );
}

public sealed record VerifiedPremiumEvent(
    string Provider,
    string EventId,
    string SubscriptionId,
    string EventType,
    DateTimeOffset OccurredAt,
    DateTimeOffset? RenewsAt
);

public interface IPremiumEventVerifier
{
    bool IsConfigured { get; }
    Task<VerifiedPremiumEvent?> Verify(
        string provider,
        string eventId,
        string subscriptionId,
        string eventType,
        DateTimeOffset occurredAt,
        DateTimeOffset? renewsAt,
        string signedPayload,
        CancellationToken ct
    );
}

public enum IdempotencyState { Acquired, Pending, Completed, Conflict }
public sealed record IdempotencyDecision(IdempotencyState State, int? StatusCode = null, string? ResponseBody = null);

public interface IIdempotencyStore
{
    Task<IdempotencyDecision> Begin(string cacheKey, string fingerprint, DateTimeOffset expiresAt, CancellationToken ct);
    Task Complete(string cacheKey, string fingerprint, int statusCode, string? responseBody, CancellationToken ct);
    Task Abandon(string cacheKey, string fingerprint, CancellationToken ct);
}

public interface IProductMetrics
{
    void BankConnected();
    void BankSynchronized();
    void FirstBankSync();
    void SubscriptionsDetected(int count);
    void RecommendationViewed();
    void RecommendationClicked();
    void PremiumActivated();
}

public sealed record RecommendationFacts(string Category, decimal CurrentMonthlyCost, decimal SuggestedMonthlyCost, decimal AnnualSaving, string Confidence, IReadOnlyList<string> Assumptions);
public interface IRecommendationExplainer
{
    Task<string> Explain(RecommendationFacts facts, string deterministicFallback, CancellationToken ct);
}

public enum PushSendResult { Sent, InvalidToken, Retry }
public sealed record PushSendOutcome(PushSendResult Result, string? ReceiptId = null);
public interface IPushSender
{
    bool IsConfigured { get; }
    Task<PushSendOutcome> Send(PushDevice device, UserNotification notification, CancellationToken ct);
}
public interface IPushReceiptChecker
{
    bool IsConfigured { get; }
    Task<IReadOnlyDictionary<string, PushSendResult>> Check(
        IReadOnlyList<string> receiptIds,
        CancellationToken ct
    );
}

public interface IIdentityLifecycle
{
    bool IsConfigured { get; }
    Task DeleteIdentity(string userId, CancellationToken ct);
}

public interface ITransactionNormalizer
{
    IReadOnlyList<BankTransaction> Normalize(IReadOnlyList<BankTransaction> transactions);
}

public sealed record Dashboard(
    int SubscriptionCount,
    decimal MonthlyRecurringCost,
    decimal AnnualPotentialSaving,
    DateTimeOffset? LastSyncAt,
    IReadOnlyList<Recommendation> TopRecommendations,
    bool HasConnectedBank,
    bool IsDemo
);

public sealed record UserDataExport(
    DateTimeOffset ExportedAt,
    UserProfile Profile,
    IReadOnlyList<ExportedBankConnection> Connections,
    IReadOnlyList<BankAccount> Accounts,
    IReadOnlyList<BankTransaction> Transactions,
    IReadOnlyList<Consent> Consents,
    IReadOnlyList<UserNotification> Notifications,
    IReadOnlyList<ExportedPushDevice> PushDevices,
    IReadOnlyList<BankSyncJob> SyncJobs,
    IReadOnlyList<SubscriptionPreference> SubscriptionPreferences,
    IReadOnlyList<RecommendationEvent> RecommendationEvents,
    IReadOnlyList<AffiliateConversion> AffiliateConversions,
    IReadOnlyList<AuditLog> AuditLogs,
    PremiumSubscription? PremiumSubscription,
    IReadOnlyList<PremiumWebhookEvent> PremiumWebhookEvents,
    IReadOnlyList<StoredRecurringPayment> StoredPayments,
    IReadOnlyList<StoredRecommendation> StoredRecommendations
);

public sealed record ExportedBankConnection(
    Guid Id,
    string BankName,
    string Provider,
    string Status,
    DateTimeOffset? LastSyncAt,
    DateTimeOffset ConsentExpiresAt
);

public sealed record ExportedPushDevice(
    Guid Id,
    string Platform,
    DateTimeOffset RegisteredAt,
    DateTimeOffset LastSeenAt,
    bool Active
);

public sealed class AnalysisService(
    IWorkspaceStore store,
    RecurringPaymentEngine recurring,
    SavingsEngine savings,
    IOfferCatalog catalog,
    TimeProvider time,
    IRecommendationExplainer explainer
)
{
    public async Task<IReadOnlyList<Payment>> Subscriptions(string userId, CancellationToken ct)
    {
        var detected = recurring.Detect(
            await store.Transactions(userId, ct),
            DateOnly.FromDateTime(time.GetUtcNow().UtcDateTime)
        );
        var preferences = (await store.SubscriptionPreferences(userId, ct)).ToDictionary(
            p => p.SubscriptionId
        );
        return detected
            .Where(p => !preferences.TryGetValue(p.Id, out var preference) || preference.Status != "ignored")
            .Select(p =>
                preferences.TryGetValue(p.Id, out var preference) && preference.Category is not null
                    ? p with { Category = preference.Category }
                    : p
            )
            .ToArray();
    }

    public async Task<IReadOnlyList<Recommendation>> Recommendations(
        string userId,
        CancellationToken ct,
        bool forceRecompute = false
    )
    {
        var payments = await Subscriptions(userId, ct);
        var offers = await catalog.GetOffers(ct);
        if (!forceRecompute)
        {
            var stored = await store.StoredRecommendations(userId, ct);
            if (stored.Count > 0)
                return stored.Select(s =>
                {
                    var payment = payments.FirstOrDefault(p => p.Id == s.SubscriptionId);
                    var offer = offers.FirstOrDefault(o => o.Id == s.OfferId);
                    return payment is null || offer is null ? null : new Recommendation(s.Id, s.SubscriptionId, payment.Merchant, s.Category, s.CurrentCost, s.SuggestedCost, s.AnnualSaving, s.Confidence, s.Explanation, s.Assumptions, offer);
                }).Where(r => r is not null).Cast<Recommendation>().OrderByDescending(r => r.AnnualSaving).ToArray();
        }
        var recommendations = savings.Calculate(payments, offers);
        var enriched = new List<Recommendation>(recommendations.Count);
        foreach (var recommendation in recommendations)
        {
            var facts = new RecommendationFacts(recommendation.Category, recommendation.CurrentCost, recommendation.SuggestedCost, recommendation.AnnualSaving, recommendation.Confidence, recommendation.Assumptions);
            enriched.Add(recommendation with { Explanation = await explainer.Explain(facts, recommendation.Explanation, ct) });
        }
        return enriched;
    }

    public async Task<Dashboard> Dashboard(string userId, bool demo, CancellationToken ct)
    {
        var payments = await Subscriptions(userId, ct);
        var recommendations = await Recommendations(userId, ct);
        var connections = await store.Connections(userId, ct);
        return new(
            payments.Count,
            payments.Sum(p => p.MonthlyCost),
            recommendations.Sum(r => r.AnnualSaving),
            connections.Select(c => c.LastSyncAt).DefaultIfEmpty().Max(),
            recommendations.Take(3).ToArray(),
            connections.Any(c => c.Status == "connected"),
            demo
        );
    }

    public async Task<IReadOnlyList<Recommendation>> Alternatives(string userId, string recommendationId, CancellationToken ct)
    {
        var existing = (await Recommendations(userId, ct)).FirstOrDefault(r => r.Id == recommendationId);
        if (existing is null) return [];
        var payment = (await Subscriptions(userId, ct)).FirstOrDefault(p => p.Id == existing.SubscriptionId);
        if (payment is null) return [];
        var alternatives = savings.Alternatives(payment, await catalog.GetOffers(ct));
        var enriched = new List<Recommendation>(alternatives.Count);
        foreach (var recommendation in alternatives)
        {
            var facts = new RecommendationFacts(recommendation.Category, recommendation.CurrentCost, recommendation.SuggestedCost, recommendation.AnnualSaving, recommendation.Confidence, recommendation.Assumptions);
            enriched.Add(recommendation with { Explanation = await explainer.Explain(facts, recommendation.Explanation, ct) });
        }
        return enriched;
    }
}
