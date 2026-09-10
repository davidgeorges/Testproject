using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using SubscriptionApp.Domain;

namespace SubscriptionApp.Persistence;

public sealed class WorkspaceDbContext(DbContextOptions<WorkspaceDbContext> options)
    : DbContext(options), IDataProtectionKeyContext
{
    public DbSet<DataProtectionKey> DataProtectionKeys => Set<DataProtectionKey>();
    public DbSet<UserProfile> Profiles => Set<UserProfile>();
    public DbSet<BankConnection> Connections => Set<BankConnection>();
    public DbSet<BankAccount> Accounts => Set<BankAccount>();
    public DbSet<BankTransaction> Transactions => Set<BankTransaction>();
    public DbSet<RecommendationEvent> Events => Set<RecommendationEvent>();
    public DbSet<AffiliateConversion> AffiliateConversions => Set<AffiliateConversion>();
    public DbSet<Consent> Consents => Set<Consent>();
    public DbSet<UserNotification> Notifications => Set<UserNotification>();
    public DbSet<PushDevice> PushDevices => Set<PushDevice>();
    public DbSet<PushReceipt> PushReceipts => Set<PushReceipt>();
    public DbSet<IdempotencyRecord> IdempotencyRecords => Set<IdempotencyRecord>();
    public DbSet<BankSyncJob> SyncJobs => Set<BankSyncJob>();
    public DbSet<SubscriptionPreference> SubscriptionPreferences => Set<SubscriptionPreference>();
    public DbSet<PartnerOffer> Offers => Set<PartnerOffer>();
    public DbSet<BankTransactionCategoryRule> CategoryRules => Set<BankTransactionCategoryRule>();
    public DbSet<CategoryBudget> CategoryBudgets => Set<CategoryBudget>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<PremiumSubscription> PremiumSubscriptions => Set<PremiumSubscription>();
    public DbSet<PremiumWebhookEvent> PremiumWebhookEvents => Set<PremiumWebhookEvent>();
    public DbSet<StoredRecurringPayment> StoredPayments => Set<StoredRecurringPayment>();
    public DbSet<StoredRecommendation> StoredRecommendations => Set<StoredRecommendation>();
    public DbSet<AccountDeletionJob> AccountDeletionJobs => Set<AccountDeletionJob>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<DataProtectionKey>().ToTable("data_protection_keys");
        b.Entity<UserProfile>().ToTable("user_profiles").HasKey(p => p.Id);
        b.Entity<UserProfile>().Property(p => p.AccentColor).HasMaxLength(7);
        b.Entity<BankConnection>()
            .ToTable("bank_connections")
            .HasIndex(c => new { c.UserId, c.Status });
        b.Entity<BankConnection>().HasIndex(c => new { c.Provider, c.ExternalConnectionId }).IsUnique();
        b.Entity<BankConnection>().Ignore(c => c.AuthorizationUrl);
        b.Entity<BankTransaction>()
            .ToTable("transactions")
            .HasIndex(t => new
            {
                t.UserId,
                t.Provider,
                t.ExternalId,
            })
            .IsUnique();
        b.Entity<BankTransaction>().HasIndex(t => new { t.UserId, t.BookedAt });
        b.Entity<BankTransaction>().Property(t => t.Amount).HasPrecision(18, 2);
        b.Entity<BankTransaction>()
            .HasOne<BankConnection>()
            .WithMany()
            .HasForeignKey(t => t.ConnectionId)
            .OnDelete(DeleteBehavior.Cascade);
        b.Entity<BankAccount>()
            .ToTable("bank_accounts")
            .HasIndex(a => new { a.ConnectionId, a.ExternalAccountId })
            .IsUnique();
        b.Entity<BankAccount>().HasIndex(a => a.UserId);
        b.Entity<BankAccount>()
            .HasOne<BankConnection>()
            .WithMany()
            .HasForeignKey(a => a.ConnectionId)
            .OnDelete(DeleteBehavior.Cascade);
        b.Entity<BankTransaction>()
            .HasOne<BankAccount>()
            .WithMany()
            .HasForeignKey(t => t.AccountId)
            .OnDelete(DeleteBehavior.Cascade);
        b.Entity<BankConnection>()
            .HasOne<UserProfile>()
            .WithMany()
            .HasForeignKey(c => c.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        b.Entity<RecommendationEvent>()
            .ToTable("recommendation_events")
            .HasIndex(e => new { e.UserId, e.OccurredAt });
        b.Entity<RecommendationEvent>().Property(e => e.ConfirmedAnnualSaving).HasPrecision(18, 2);
        b.Entity<RecommendationEvent>()
            .HasOne<UserProfile>()
            .WithMany()
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        b.Entity<AffiliateConversion>().ToTable("affiliate_conversions").HasIndex(c => new { c.Provider, c.ExternalConversionId }).IsUnique();
        b.Entity<AffiliateConversion>().HasIndex(c => new { c.UserId, c.CreatedAt });
        b.Entity<AffiliateConversion>().Property(c => c.Amount).HasPrecision(18, 2);
        b.Entity<AffiliateConversion>().HasOne<RecommendationEvent>().WithMany().HasForeignKey(c => c.RecommendationEventId).OnDelete(DeleteBehavior.Cascade);
        b.Entity<AffiliateConversion>().HasOne<UserProfile>().WithMany().HasForeignKey(c => c.UserId).OnDelete(DeleteBehavior.Cascade);
        b.Entity<Consent>()
            .ToTable("consents")
            .HasOne<UserProfile>()
            .WithMany()
            .HasForeignKey(c => c.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        b.Entity<UserNotification>()
            .ToTable("notifications")
            .HasIndex(n => new { n.UserId, n.CreatedAt });
        b.Entity<UserNotification>()
            .HasIndex(n => new { n.UserId, n.SourceKey })
            .IsUnique();
        b.Entity<UserNotification>()
            .HasOne<UserProfile>()
            .WithMany()
            .HasForeignKey(n => n.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        b.Entity<PushDevice>().ToTable("push_devices").HasIndex(d => new { d.UserId, d.Token }).IsUnique();
        b.Entity<PushDevice>().HasIndex(d => d.UserId);
        b.Entity<PushDevice>()
            .HasOne<UserProfile>()
            .WithMany()
            .HasForeignKey(d => d.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        b.Entity<PushReceipt>().ToTable("push_receipts").HasIndex(r => r.TicketId).IsUnique();
        b.Entity<PushReceipt>().HasIndex(r => new { r.Status, r.CheckAfter });
        b.Entity<PushReceipt>().HasOne<UserNotification>().WithMany().HasForeignKey(r => r.NotificationId).OnDelete(DeleteBehavior.Cascade);
        b.Entity<PushReceipt>().HasOne<PushDevice>().WithMany().HasForeignKey(r => r.DeviceId).OnDelete(DeleteBehavior.Cascade);
        b.Entity<IdempotencyRecord>().ToTable("idempotency_records").HasKey(r => r.CacheKey);
        b.Entity<IdempotencyRecord>().HasIndex(r => r.ExpiresAt);
        b.Entity<IdempotencyRecord>().Property(r => r.CacheKey).HasMaxLength(512);
        b.Entity<BankSyncJob>().ToTable("bank_sync_jobs").HasIndex(j => new { j.Status, j.CreatedAt });
        b.Entity<BankSyncJob>().HasIndex(j => new { j.UserId, j.CreatedAt });
        b.Entity<BankSyncJob>()
            .HasOne<BankConnection>()
            .WithMany()
            .HasForeignKey(j => j.ConnectionId)
            .OnDelete(DeleteBehavior.Cascade);
        b.Entity<BankSyncJob>()
            .HasOne<UserProfile>()
            .WithMany()
            .HasForeignKey(j => j.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        b.Entity<SubscriptionPreference>()
            .ToTable("subscription_preferences")
            .HasIndex(p => new { p.UserId, p.SubscriptionId })
            .IsUnique();
        b.Entity<SubscriptionPreference>()
            .HasOne<UserProfile>()
            .WithMany()
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        b.Entity<PartnerOffer>().ToTable("offers").HasKey(o => o.Id);
        b.Entity<PartnerOffer>().HasIndex(o => new { o.Category, o.Active });
        b.Entity<PartnerOffer>().Property(o => o.MonthlyPrice).HasPrecision(18, 2);
        b.Entity<PartnerOffer>().Property(o => o.SetupFee).HasPrecision(18, 2);
        b.Entity<BankTransaction>()
            .Property(t => t.IsInternalTransfer)
            .HasDefaultValue(false);
        b.Entity<BankTransactionCategoryRule>()
            .ToTable("transaction_category_rules")
            .HasIndex(r => new { r.UserId, r.TransactionId })
            .IsUnique();
        b.Entity<BankTransactionCategoryRule>()
            .HasIndex(r => new { r.UserId, r.Category });
        b.Entity<BankTransactionCategoryRule>()
            .HasOne<UserProfile>()
            .WithMany()
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        b.Entity<BankTransactionCategoryRule>()
            .HasOne<BankTransaction>()
            .WithMany()
            .HasForeignKey(r => r.TransactionId)
            .OnDelete(DeleteBehavior.Cascade);
        b.Entity<CategoryBudget>()
            .ToTable("category_budgets")
            .HasIndex(budget => new { budget.UserId, budget.Category })
            .IsUnique();
        b.Entity<CategoryBudget>()
            .Property(budget => budget.MonthlyLimit)
            .HasPrecision(18, 2);
        b.Entity<CategoryBudget>()
            .Property(budget => budget.DisplayName)
            .HasMaxLength(60);
        b.Entity<CategoryBudget>()
            .HasOne<UserProfile>()
            .WithMany()
            .HasForeignKey(budget => budget.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        b.Entity<AuditLog>().ToTable("audit_logs").HasIndex(a => new { a.UserId, a.CreatedAt });
        b.Entity<AuditLog>()
            .HasOne<UserProfile>()
            .WithMany()
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        b.Entity<PremiumSubscription>()
            .ToTable("premium_subscriptions")
            .HasIndex(p => new { p.Provider, p.ExternalSubscriptionId })
            .IsUnique();
        b.Entity<PremiumSubscription>().HasIndex(p => new { p.UserId, p.Status });
        b.Entity<PremiumSubscription>()
            .HasOne<UserProfile>()
            .WithMany()
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        b.Entity<PremiumWebhookEvent>()
            .ToTable("premium_webhook_events")
            .HasIndex(e => new { e.Provider, e.ExternalEventId })
            .IsUnique();
        b.Entity<PremiumWebhookEvent>().HasIndex(e => new { e.Provider, e.ExternalSubscriptionId });
        b.Entity<PremiumWebhookEvent>()
            .HasOne<UserProfile>()
            .WithMany()
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        b.Entity<StoredRecurringPayment>()
            .ToTable("recurring_payments")
            .HasKey(p => new { p.UserId, p.Id });
        b.Entity<StoredRecurringPayment>().HasIndex(p => new { p.UserId, p.ComputedAt });
        b.Entity<StoredRecurringPayment>().Property(p => p.AverageAmount).HasPrecision(18, 2);
        b.Entity<StoredRecurringPayment>().Property(p => p.MonthlyCost).HasPrecision(18, 2);
        b.Entity<StoredRecurringPayment>()
            .HasOne<UserProfile>()
            .WithMany()
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        b.Entity<StoredRecommendation>()
            .ToTable("recommendations")
            .HasKey(r => new { r.UserId, r.Id });
        b.Entity<StoredRecommendation>().HasIndex(r => new { r.UserId, r.Status });
        b.Entity<StoredRecommendation>().Property(r => r.CurrentCost).HasPrecision(18, 2);
        b.Entity<StoredRecommendation>().Property(r => r.SuggestedCost).HasPrecision(18, 2);
        b.Entity<StoredRecommendation>().Property(r => r.AnnualSaving).HasPrecision(18, 2);
        b.Entity<StoredRecommendation>()
            .HasOne<UserProfile>()
            .WithMany()
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        b.Entity<AccountDeletionJob>().ToTable("account_deletion_jobs").HasKey(j => j.Id);
        b.Entity<AccountDeletionJob>().HasIndex(j => j.UserId).IsUnique();
        b.Entity<AccountDeletionJob>().HasIndex(j => new { j.Status, j.UpdatedAt });
    }
}
