using SubscriptionApp.Application;
using SubscriptionApp.Domain;

namespace SubscriptionApp.Infrastructure;

public sealed class BankSyncProcessor(IWorkspaceStore store, IBankingProvider provider, AnalysisService analysis, TimeProvider time, IProductMetrics metrics, ITransactionNormalizer normalizer)
{
    public async Task<int> Synchronize(BankConnection bank, CancellationToken ct)
    {
        if (!provider.IsConfigured) throw new InvalidOperationException("BANKING_NOT_CONFIGURED");
        if (bank.ConsentExpiresAt <= time.GetUtcNow()) throw new InvalidOperationException("CONSENT_EXPIRED");
        var isFirstSync = bank.LastSyncAt is null;
        var rows = normalizer.Normalize(await provider.FetchTransactions(bank, ct));
        await store.Synchronize(bank, rows, ct);
        await store.AddNotification(new()
        {
            UserId = bank.UserId,
            Type = "sync_completed",
            Title = "Votre analyse est terminée",
            Body = $"{rows.Count} transactions ont été analysées.",
            SourceKey = $"sync:{bank.Id}:{bank.LastSyncAt:O}",
        }, ct);
        var payments = await analysis.Subscriptions(bank.UserId, ct);
        var recommendations = await analysis.Recommendations(bank.UserId, ct, true);
        metrics.BankSynchronized();
        if (isFirstSync) metrics.FirstBankSync();
        metrics.SubscriptionsDetected(payments.Count);
        await store.SaveAnalysis(bank.UserId, payments, recommendations, ct);
        var premium = await store.Premium(bank.UserId, ct);
        var premiumActive = premium is not null
            && premium.Status is "active" or "cancelled"
            && premium.RenewsAt > time.GetUtcNow();
        if (premiumActive && recommendations.FirstOrDefault() is { } best)
            await store.AddNotification(new()
            {
                UserId = bank.UserId,
                Type = "saving_found",
                Title = "Nouvelle économie détectée",
                Body = $"Vous pouvez économiser {best.AnnualSaving:0.##} €/an avec {best.Title.ToLowerInvariant()}.",
                ResourceId = best.Id,
                SourceKey = $"saving:{best.Id}",
            }, ct);
        await store.AddAudit(new()
        {
            UserId = bank.UserId,
            Action = "bank.synchronized",
            ResourceType = "bank_connection",
            ResourceId = bank.Id.ToString(),
        }, ct);
        return rows.Count;
    }
}
