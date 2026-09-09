using System.Net;
using System.Text;
using SubscriptionApp.Application;
using SubscriptionApp.Domain;
using SubscriptionApp.Infrastructure;
using Xunit;

namespace SubscriptionApp.Tests;

public sealed class PushDeliveryTests
{
    [Fact]
    public async Task ProcessorDeliversPendingNotificationAndPersistsResult()
    {
        var store = new InMemoryWorkspaceStore();
        var userId = Guid.NewGuid().ToString();
        await store.Profile(userId, default);
        await store.SavePushDevice(new() { UserId = userId, Platform = "android", Token = new string('t', 32) }, default);
        var notification = new UserNotification { UserId = userId, Title = "Titre", Body = "Corps", SourceKey = Guid.NewGuid().ToString() };
        await store.AddNotification(notification, default);
        var processor = new PushDeliveryProcessor(store, new Sender(PushSendResult.Sent), TimeProvider.System);

        Assert.Equal(1, await processor.RunOnce(default));
        var stored = Assert.Single(await store.Notifications(userId, default), n => n.Id == notification.Id);
        Assert.Equal("sent", stored.PushStatus);
        Assert.Equal(1, stored.PushAttempts);
        Assert.NotNull(stored.PushedAt);
    }

    [Fact]
    public async Task ProcessorDoesNothingWithoutConfiguredProvider()
    {
        var store = new InMemoryWorkspaceStore();
        var processor = new PushDeliveryProcessor(store, new UnavailablePushSender(), TimeProvider.System);
        Assert.Equal(0, await processor.RunOnce(default));
    }

    [Fact]
    public async Task DeliveryLeasePreventsConcurrentClaimAndCanExpire()
    {
        var store = new InMemoryWorkspaceStore();
        var userId = Guid.NewGuid().ToString();
        await store.Profile(userId, default);
        await store.AddNotification(new() { UserId = userId, SourceKey = Guid.NewGuid().ToString() }, default);
        var now = DateTimeOffset.UtcNow;
        Assert.Single(await store.ClaimPushNotifications(10, now, TimeSpan.FromMinutes(2), default));
        Assert.Empty(await store.ClaimPushNotifications(10, now.AddMinutes(1), TimeSpan.FromMinutes(2), default));
        Assert.Single(await store.ClaimPushNotifications(10, now.AddMinutes(3), TimeSpan.FromMinutes(2), default));
    }

    [Fact]
    public async Task InvalidProviderTokenDeactivatesDevice()
    {
        var store = new InMemoryWorkspaceStore();
        var userId = Guid.NewGuid().ToString();
        await store.Profile(userId, default);
        await store.SavePushDevice(new() { UserId = userId, Platform = "ios", Token = new string('x', 32) }, default);
        await store.AddNotification(new() { UserId = userId, SourceKey = Guid.NewGuid().ToString() }, default);
        await new PushDeliveryProcessor(store, new Sender(PushSendResult.InvalidToken), TimeProvider.System).RunOnce(default);
        Assert.Empty(await store.PushDevices(userId, default));
    }

    [Fact]
    public async Task ProcessorHonoursDisabledNotificationPreference()
    {
        var store = new InMemoryWorkspaceStore();
        var userId = Guid.NewGuid().ToString();
        var profile = await store.Profile(userId, default);
        profile.NotificationsEnabled = false;
        await store.SaveProfile(profile, default);
        await store.SavePushDevice(new() { UserId = userId, Platform = "android", Token = new string('t', 32) }, default);
        var notification = new UserNotification { UserId = userId, SourceKey = Guid.NewGuid().ToString() };
        await store.AddNotification(notification, default);
        var sender = new CountingSender();

        Assert.Equal(0, await new PushDeliveryProcessor(store, sender, TimeProvider.System).RunOnce(default));
        Assert.Equal(0, sender.Count);
        Assert.Equal("pending", Assert.Single(await store.Notifications(userId, default)).PushStatus);
    }

    [Theory]
    [InlineData("{\"data\":{\"status\":\"ok\",\"id\":\"ticket\"}}", PushSendResult.Sent)]
    [InlineData("{\"data\":{\"status\":\"error\",\"details\":{\"error\":\"DeviceNotRegistered\"}}}", PushSendResult.InvalidToken)]
    public async Task ExpoSenderInterpretsPushTickets(string response, PushSendResult expected)
    {
        var handler = new StubHandler(response);
        var sender = new ExpoPushSender(new HttpClient(handler) { BaseAddress = new Uri("https://exp.host/") });
        var result = await sender.Send(
            new PushDevice { Token = "ExponentPushToken[test]", Platform = "android" },
            new UserNotification { Title = "Titre", Body = "Corps" },
            default);

        Assert.Equal(expected, result);
        Assert.Equal("/--/api/v2/push/send", handler.RequestUri?.AbsolutePath);
    }

    private sealed class Sender(PushSendResult result) : IPushSender
    {
        public bool IsConfigured => true;
        public Task<PushSendResult> Send(PushDevice device, UserNotification notification, CancellationToken ct) => Task.FromResult(result);
    }

    private sealed class CountingSender : IPushSender
    {
        public int Count { get; private set; }
        public bool IsConfigured => true;
        public Task<PushSendResult> Send(PushDevice device, UserNotification notification, CancellationToken ct)
        {
            Count++;
            return Task.FromResult(PushSendResult.Sent);
        }
    }

    private sealed class StubHandler(string body) : HttpMessageHandler
    {
        public Uri? RequestUri { get; private set; }
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            RequestUri = request.RequestUri;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(body, Encoding.UTF8, "application/json"),
            });
        }
    }
}
