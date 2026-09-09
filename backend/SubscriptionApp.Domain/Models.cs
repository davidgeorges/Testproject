namespace SubscriptionApp.Domain;

public sealed class UserProfile
{
    public string Id { get; set; } = "";
    public string FirstName { get; set; } = "";
    public string Theme { get; set; } = "dark";
    public bool NotificationsEnabled { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class BankConnection
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string UserId { get; set; } = "";
    public string BankName { get; set; } = "";
    public string Provider { get; set; } = "sandbox";
    public string? ExternalConnectionId { get; set; }
    public string? AuthorizationUrl { get; set; }
    public string Status { get; set; } = "pending";
    public DateTimeOffset? LastSyncAt { get; set; }
    public DateTimeOffset ConsentExpiresAt { get; set; } = DateTimeOffset.UtcNow.AddDays(90);
}

public sealed class BankTransaction
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ConnectionId { get; set; }
    public Guid? AccountId { get; set; }
    public string UserId { get; set; } = "";
    public string ExternalId { get; set; } = "";
    public string Provider { get; set; } = "sandbox";
    public string AccountKey { get; set; } = "";
    public DateOnly BookedAt { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "EUR";
    public string MerchantName { get; set; } = "";
    public string Category { get; set; } = "other";
}

public sealed class BankAccount
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ConnectionId { get; set; }
    public string UserId { get; set; } = "";
    public string ExternalAccountId { get; set; } = "";
    public string AccountType { get; set; } = "checking";
    public string MaskedName { get; set; } = "Compte ••••";
}

public sealed class RecommendationEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string UserId { get; set; } = "";
    public string RecommendationId { get; set; } = "";
    public string EventType { get; set; } = "click";
    public DateTimeOffset OccurredAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class AffiliateConversion
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string UserId { get; set; } = "";
    public Guid RecommendationEventId { get; set; }
    public string Provider { get; set; } = "";
    public string ExternalConversionId { get; set; } = "";
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "EUR";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class Consent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string UserId { get; set; } = "";
    public string Type { get; set; } = "bank_analysis";
    public string Version { get; set; } = "1";
    public string? SubjectId { get; set; }
    public DateTimeOffset GrantedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? RevokedAt { get; set; }
}

public sealed class UserNotification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string UserId { get; set; } = "";
    public string Type { get; set; } = "info";
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    public string? ResourceId { get; set; }
    public string SourceKey { get; set; } = "";
    public DateTimeOffset? ReadAt { get; set; }
    public string PushStatus { get; set; } = "pending";
    public int PushAttempts { get; set; }
    public DateTimeOffset? PushAttemptedAt { get; set; }
    public DateTimeOffset? PushedAt { get; set; }
    public DateTimeOffset? PushLeaseExpiresAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class PushDevice
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string UserId { get; set; } = "";
    public string Platform { get; set; } = "";
    public string Token { get; set; } = "";
    public DateTimeOffset RegisteredAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset LastSeenAt { get; set; } = DateTimeOffset.UtcNow;
    public bool Active { get; set; } = true;
}

public sealed class IdempotencyRecord
{
    public string CacheKey { get; set; } = "";
    public string Fingerprint { get; set; } = "";
    public int? StatusCode { get; set; }
    public string? ResponseBody { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset ExpiresAt { get; set; }
}

public sealed class BankSyncJob
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string UserId { get; set; } = "";
    public Guid ConnectionId { get; set; }
    public string Status { get; set; } = "queued";
    public int Attempts { get; set; }
    public int? TransactionCount { get; set; }
    public string? ErrorCode { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? LeaseExpiresAt { get; set; }
}

public sealed class SubscriptionPreference
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string UserId { get; set; } = "";
    public string SubscriptionId { get; set; } = "";
    public string? Category { get; set; }
    public string Status { get; set; } = "active";
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class AuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string UserId { get; set; } = "";
    public string Action { get; set; } = "";
    public string ResourceType { get; set; } = "";
    public string? ResourceId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class PremiumSubscription
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string UserId { get; set; } = "";
    public string Provider { get; set; } = "";
    public string ExternalSubscriptionId { get; set; } = "";
    public string Plan { get; set; } = "";
    public string Status { get; set; } = "active";
    public DateTimeOffset RenewsAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class PremiumWebhookEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string UserId { get; set; } = "";
    public string Provider { get; set; } = "";
    public string ExternalEventId { get; set; } = "";
    public string ExternalSubscriptionId { get; set; } = "";
    public string EventType { get; set; } = "";
    public DateTimeOffset OccurredAt { get; set; }
    public DateTimeOffset ProcessedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class StoredRecurringPayment
{
    public string Id { get; set; } = "";
    public string UserId { get; set; } = "";
    public string Merchant { get; set; } = "";
    public string Category { get; set; } = "";
    public string Cadence { get; set; } = "";
    public decimal AverageAmount { get; set; }
    public decimal MonthlyCost { get; set; }
    public string Confidence { get; set; } = "";
    public DateOnly FirstSeenAt { get; set; }
    public DateOnly LastSeenAt { get; set; }
    public DateOnly NextPaymentAt { get; set; }
    public DateTimeOffset ComputedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class StoredRecommendation
{
    public string Id { get; set; } = "";
    public string UserId { get; set; } = "";
    public string SubscriptionId { get; set; } = "";
    public string Category { get; set; } = "";
    public decimal CurrentCost { get; set; }
    public decimal SuggestedCost { get; set; }
    public decimal AnnualSaving { get; set; }
    public string Confidence { get; set; } = "";
    public string Explanation { get; set; } = "";
    public string[] Assumptions { get; set; } = [];
    public string OfferId { get; set; } = "";
    public string Status { get; set; } = "available";
    public DateTimeOffset ComputedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed record Payment(
    string Id,
    string Merchant,
    string Category,
    string Cadence,
    decimal Amount,
    decimal MonthlyCost,
    string Confidence,
    DateOnly FirstSeenAt,
    DateOnly LastSeenAt,
    DateOnly NextPaymentAt,
    IReadOnlyList<PaymentHistory> History
);

public sealed record PaymentHistory(DateOnly Date, decimal Amount);

public sealed record Offer(
    string Id,
    string Category,
    string ProviderName,
    decimal MonthlyPrice,
    decimal SetupFee,
    string[] Benefits,
    string[] Assumptions,
    bool Active,
    bool IsPartner,
    string? Url
);

public sealed class PartnerOffer
{
    public string Id { get; set; } = "";
    public string Category { get; set; } = "";
    public string ProviderName { get; set; } = "";
    public decimal MonthlyPrice { get; set; }
    public decimal SetupFee { get; set; }
    public string[] Benefits { get; set; } = [];
    public string[] Assumptions { get; set; } = [];
    public bool Active { get; set; } = true;
    public bool IsPartner { get; set; }
    public string? Url { get; set; }
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Offer ToOffer() =>
        new(
            Id,
            Category,
            ProviderName,
            MonthlyPrice,
            SetupFee,
            Benefits,
            Assumptions,
            Active,
            IsPartner,
            Url
        );
}

public sealed record Recommendation(
    string Id,
    string SubscriptionId,
    string Title,
    string Category,
    decimal CurrentCost,
    decimal SuggestedCost,
    decimal AnnualSaving,
    string Confidence,
    string Explanation,
    string[] Assumptions,
    Offer Offer
);
