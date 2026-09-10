using SubscriptionApp.Infrastructure;

namespace SubscriptionApp.Api;

public sealed class PushReceiptWorker(
    IServiceScopeFactory scopes,
    ILogger<PushReceiptWorker> logger
) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var count = await scope.ServiceProvider
                    .GetRequiredService<PushReceiptProcessor>()
                    .RunOnce(stoppingToken);
                await Task.Delay(count > 0 ? TimeSpan.FromMinutes(1) : TimeSpan.FromMinutes(5), stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "Push receipt iteration failed");
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
        }
    }
}
