using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Google.Apis.Auth.OAuth2;
using SubscriptionApp.Application;
using SubscriptionApp.Domain;

namespace SubscriptionApp.Infrastructure;

public sealed class UnavailablePushSender : IPushSender
{
    public bool IsConfigured => false;
    public Task<PushSendResult> Send(PushDevice device, UserNotification notification, CancellationToken ct) => Task.FromResult(PushSendResult.Retry);
}

public sealed class FirebasePushSender : IPushSender
{
    private readonly HttpClient http;
    private readonly GoogleCredential credential;
    private readonly string projectId;
    private FirebasePushSender(HttpClient http, GoogleCredential credential, string projectId) =>
        (this.http, this.credential, this.projectId) = (http, credential, projectId);
    public bool IsConfigured => true;
    public async Task<PushSendResult> Send(PushDevice device, UserNotification notification, CancellationToken ct)
    {
        var accessToken = await ((ITokenAccess)credential).GetAccessTokenForRequestAsync(cancellationToken: ct);
        using var request = new HttpRequestMessage(HttpMethod.Post, $"https://fcm.googleapis.com/v1/projects/{Uri.EscapeDataString(projectId)}/messages:send");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        request.Content = JsonContent.Create(new { message = new { token = device.Token, notification = new { title = notification.Title, body = notification.Body }, data = new { type = notification.Type, resourceId = notification.ResourceId ?? "" } } });
        using var response = await http.SendAsync(request, ct);
        if (response.IsSuccessStatusCode) return PushSendResult.Sent;
        if (response.StatusCode is HttpStatusCode.BadRequest or HttpStatusCode.NotFound) return PushSendResult.InvalidToken;
        return PushSendResult.Retry;
    }

    public static IPushSender Create(HttpClient http, string serviceAccountJson, string projectId)
    {
        var credential = CredentialFactory.FromJson<ServiceAccountCredential>(serviceAccountJson)
            .ToGoogleCredential().CreateScoped("https://www.googleapis.com/auth/firebase.messaging");
        return new FirebasePushSender(http, credential, projectId);
    }
}

public sealed class PushDeliveryProcessor(IWorkspaceStore store, IPushSender sender, TimeProvider time)
{
    public async Task<int> RunOnce(CancellationToken ct)
    {
        if (!sender.IsConfigured) return 0;
        var delivered = 0;
        foreach (var notification in await store.ClaimPushNotifications(50, time.GetUtcNow(), TimeSpan.FromMinutes(2), ct))
        {
            var devices = await store.PushDevices(notification.UserId, ct);
            if (devices.Count == 0) { await store.MarkPushResult(notification.Id, false, false, time.GetUtcNow(), ct); continue; }
            var results = new List<PushSendResult>();
            foreach (var device in devices)
            {
                var result = await sender.Send(device, notification, ct);
                results.Add(result);
                if (result == PushSendResult.InvalidToken) await store.DeactivatePushDevice(device.Id, ct);
            }
            var sent = results.Any(r => r == PushSendResult.Sent);
            await store.MarkPushResult(notification.Id, sent, !sent && results.Any(r => r == PushSendResult.Retry), time.GetUtcNow(), ct);
            if (sent) delivered++;
        }
        return delivered;
    }
}
