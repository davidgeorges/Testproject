using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SubscriptionApp.Persistence;

public sealed class DesignTimeFactory : IDesignTimeDbContextFactory<WorkspaceDbContext>
{
    public WorkspaceDbContext CreateDbContext(string[] args) =>
        new(
            new DbContextOptionsBuilder<WorkspaceDbContext>()
                .UseNpgsql(
                    Environment.GetEnvironmentVariable("ConnectionStrings__Postgres")
                        ?? "Host=localhost;Port=5432;Database=subscriptions;Username=subscriptions;Password=local-development-only"
                )
                .Options
        );
}
