using SubscriptionApp.Application;

namespace SubscriptionApp.Api;

public sealed class DemoIdentityLifecycle(DemoSessions sessions) : IIdentityLifecycle
{
    public bool IsConfigured => true;
    public Task DeleteIdentity(string userId, CancellationToken ct) { sessions.Revoke(userId); return Task.CompletedTask; }
}

public sealed class UnavailableIdentityLifecycle : IIdentityLifecycle
{
    public bool IsConfigured => false;
    public Task DeleteIdentity(string userId, CancellationToken ct) => throw new InvalidOperationException("IDENTITY_LIFECYCLE_NOT_CONFIGURED");
}
