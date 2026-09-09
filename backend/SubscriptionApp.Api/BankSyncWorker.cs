using SubscriptionApp.Application;
using SubscriptionApp.Infrastructure;

namespace SubscriptionApp.Api;

public sealed class BankSyncWorker(IServiceScopeFactory scopes, TimeProvider time, ILogger<BankSyncWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var store = scope.ServiceProvider.GetRequiredService<IWorkspaceStore>();
                var job = await store.ClaimSyncJob(time.GetUtcNow(), TimeSpan.FromMinutes(5), stoppingToken);
                if (job is null) { await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken); continue; }
                var bank = (await store.Connections(job.UserId, stoppingToken)).FirstOrDefault(b => b.Id == job.ConnectionId);
                if (bank is null) { await store.FailSyncJob(job.Id, "CONNECTION_NOT_FOUND", false, time.GetUtcNow(), stoppingToken); continue; }
                try
                {
                    var count = await scope.ServiceProvider.GetRequiredService<BankSyncProcessor>().Synchronize(bank, stoppingToken);
                    await store.CompleteSyncJob(job.Id, count, time.GetUtcNow(), stoppingToken);
                }
                catch (Exception exception) when (exception is not OperationCanceledException)
                {
                    var retry = job.Attempts < 3;
                    await store.FailSyncJob(job.Id, exception is InvalidOperationException e ? e.Message : "SYNC_FAILED", retry, time.GetUtcNow(), stoppingToken);
                    if (!retry)
                        await store.AddNotification(new()
                        {
                            UserId = job.UserId,
                            Type = "sync_failed",
                            Title = "La synchronisation a échoué",
                            Body = "Nous n’avons pas pu actualiser vos transactions. Réessayez plus tard.",
                            SourceKey = $"sync-failed:{job.Id}",
                        }, stoppingToken);
                    logger.LogWarning(exception, "Bank sync job {JobId} failed on attempt {Attempt}", job.Id, job.Attempts);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception exception) { logger.LogError(exception, "Bank sync worker iteration failed"); await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken); }
        }
    }
}
