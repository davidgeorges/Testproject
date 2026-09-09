using System.Diagnostics.Metrics;
using SubscriptionApp.Application;

namespace SubscriptionApp.Api;

public sealed class ProductMetrics : IProductMetrics, IDisposable
{
    public const string MeterName = "SubscriptionApp.Product";
    private readonly Meter meter = new(MeterName, "1.0.0");
    private readonly Counter<long> bankConnected;
    private readonly Counter<long> bankSynchronized;
    private readonly Counter<long> firstBankSync;
    private readonly Counter<long> subscriptionsDetected;
    private readonly Counter<long> recommendationViewed;
    private readonly Counter<long> recommendationClicked;
    private readonly Counter<long> premiumActivated;

    public ProductMetrics()
    {
        bankConnected = meter.CreateCounter<long>("product.bank.connected");
        bankSynchronized = meter.CreateCounter<long>("product.bank.synchronized");
        firstBankSync = meter.CreateCounter<long>("product.bank.first_sync");
        subscriptionsDetected = meter.CreateCounter<long>("product.subscriptions.detected");
        recommendationViewed = meter.CreateCounter<long>("product.recommendation.viewed");
        recommendationClicked = meter.CreateCounter<long>("product.recommendation.clicked");
        premiumActivated = meter.CreateCounter<long>("product.premium.activated");
    }

    public void BankConnected() => bankConnected.Add(1);
    public void BankSynchronized() => bankSynchronized.Add(1);
    public void FirstBankSync() => firstBankSync.Add(1);
    public void SubscriptionsDetected(int count) => subscriptionsDetected.Add(count);
    public void RecommendationViewed() => recommendationViewed.Add(1);
    public void RecommendationClicked() => recommendationClicked.Add(1);
    public void PremiumActivated() => premiumActivated.Add(1);
    public void Dispose() => meter.Dispose();
}
