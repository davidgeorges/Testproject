using SubscriptionApp.Application;

namespace SubscriptionApp.Api;

public sealed class AccountDeletionWorker(
    IServiceScopeFactory scopes,
    TimeProvider time,
    ILogger<AccountDeletionWorker> logger
) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var store = scope.ServiceProvider.GetRequiredService<IWorkspaceStore>();
                var identity = scope.ServiceProvider.GetRequiredService<IIdentityLifecycle>();
                var job = await store.ClaimAccountDeletion(
                    time.GetUtcNow(),
                    TimeSpan.FromMinutes(5),
                    stoppingToken
                );
                if (job is null)
                {
                    await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
                    continue;
                }

                try
                {
                    // This operation is idempotent. The durable job is intentionally not linked
                    // to the profile, so it survives deletion and a process restart.
                    await store.DeleteAccount(job.UserId, stoppingToken);
                    if (identity.IsConfigured)
                        await identity.DeleteIdentity(job.UserId, stoppingToken);
                    await store.CompleteAccountDeletion(
                        job.Id,
                        identity.IsConfigured ? "completed" : "data_deleted",
                        time.GetUtcNow(),
                        stoppingToken
                    );
                }
                catch (Exception exception) when (exception is not OperationCanceledException)
                {
                    await store.FailAccountDeletion(
                        job.Id,
                        exception.GetType().Name,
                        time.GetUtcNow(),
                        stoppingToken
                    );
                    logger.LogWarning(exception, "Account deletion job {JobId} failed", job.Id);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "Account deletion worker iteration failed");
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
        }
    }
}
