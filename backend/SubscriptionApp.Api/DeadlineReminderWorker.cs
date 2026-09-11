using SubscriptionApp.Infrastructure;

namespace SubscriptionApp.Api;

public sealed class DeadlineReminderWorker(
    IServiceScopeFactory scopes,
    TimeProvider time,
    ILogger<DeadlineReminderWorker> logger
) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Scan(stoppingToken);
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(5), time);
        while (await timer.WaitForNextTickAsync(stoppingToken)) await Scan(stoppingToken);
    }

    private async Task Scan(CancellationToken ct)
    {
        try
        {
            await using var scope = scopes.CreateAsyncScope();
            var processor = scope.ServiceProvider.GetRequiredService<DeadlineReminderProcessor>();
            var count = await processor.RunOnce(ct);
            if (count > 0) logger.LogInformation("Deadline reminder scan created {Count} notifications", count);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { }
        catch (Exception exception)
        {
            logger.LogError(exception, "Deadline reminder scan failed");
        }
    }
}
