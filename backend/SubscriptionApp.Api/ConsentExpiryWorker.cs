using SubscriptionApp.Infrastructure;

namespace SubscriptionApp.Api;

public sealed class ConsentExpiryWorker(
    IServiceScopeFactory scopes,
    TimeProvider time,
    ILogger<ConsentExpiryWorker> logger
) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromHours(6), time);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var processor = scope.ServiceProvider.GetRequiredService<ConsentExpiryProcessor>();
                var count = await processor.RunOnce(stoppingToken);
                logger.LogInformation("Consent expiry scan completed with {Count} candidates", count);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "Consent expiry scan failed");
            }
        }
    }
}
