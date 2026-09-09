using SubscriptionApp.Application;

namespace SubscriptionApp.Api;

public sealed class DataRetentionWorker(IServiceScopeFactory scopes, TimeProvider time, ILogger<DataRetentionWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Run(stoppingToken);
        using var timer = new PeriodicTimer(TimeSpan.FromHours(24), time);
        while (await timer.WaitForNextTickAsync(stoppingToken)) await Run(stoppingToken);
    }

    private async Task Run(CancellationToken ct)
    {
        try
        {
            await using var scope = scopes.CreateAsyncScope();
            var count = await scope.ServiceProvider.GetRequiredService<IWorkspaceStore>().PurgeExpiredData(time.GetUtcNow(), ct);
            logger.LogInformation("Data retention completed, {Count} records removed", count);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { }
        catch (Exception exception) { logger.LogError(exception, "Data retention failed"); }
    }
}
