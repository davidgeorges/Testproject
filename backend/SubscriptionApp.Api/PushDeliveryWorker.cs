using SubscriptionApp.Infrastructure;

namespace SubscriptionApp.Api;

public sealed class PushDeliveryWorker(IServiceScopeFactory scopes, ILogger<PushDeliveryWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var count = await scope.ServiceProvider.GetRequiredService<PushDeliveryProcessor>().RunOnce(stoppingToken);
                await Task.Delay(count > 0 ? TimeSpan.FromSeconds(1) : TimeSpan.FromSeconds(10), stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception exception) { logger.LogError(exception, "Push delivery iteration failed"); await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken); }
        }
    }
}
