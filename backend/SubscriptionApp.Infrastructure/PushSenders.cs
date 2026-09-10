using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Google.Apis.Auth.OAuth2;
using SubscriptionApp.Application;
using SubscriptionApp.Domain;

namespace SubscriptionApp.Infrastructure;

public sealed class UnavailablePushSender : IPushSender
{
    public bool IsConfigured => false;
    public Task<PushSendOutcome> Send(PushDevice device, UserNotification notification, CancellationToken ct) => Task.FromResult(new PushSendOutcome(PushSendResult.Retry));
}

public sealed class UnavailablePushReceiptChecker : IPushReceiptChecker
{
    public bool IsConfigured => false;
    public Task<IReadOnlyDictionary<string, PushSendResult>> Check(IReadOnlyList<string> receiptIds, CancellationToken ct) =>
        Task.FromResult<IReadOnlyDictionary<string, PushSendResult>>(new Dictionary<string, PushSendResult>());
}

public sealed class ExpoPushSender(HttpClient http, string? accessToken = null) : IPushSender, IPushReceiptChecker
{
    public bool IsConfigured => true;

    public async Task<PushSendOutcome> Send(PushDevice device, UserNotification notification, CancellationToken ct)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "--/api/v2/push/send");
        if (!string.IsNullOrWhiteSpace(accessToken))
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        request.Content = JsonContent.Create(new
        {
            to = device.Token,
            title = notification.Title,
            body = notification.Body,
            sound = "default",
            data = new { type = notification.Type, resourceId = notification.ResourceId ?? "" },
        });
        using var response = await http.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode) return new(response.StatusCode == HttpStatusCode.BadRequest
            ? PushSendResult.InvalidToken
            : PushSendResult.Retry);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
        var ticket = json.RootElement.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Array
            ? data.EnumerateArray().FirstOrDefault()
            : data;
        var status = ticket.ValueKind == JsonValueKind.Object && ticket.TryGetProperty("status", out var value)
            ? value.GetString()
            : null;
        var receiptId = ticket.ValueKind == JsonValueKind.Object && ticket.TryGetProperty("id", out var id)
            ? id.GetString()
            : null;
        if (status == "ok") return new(PushSendResult.Sent, receiptId);
        var error = ticket.ValueKind == JsonValueKind.Object
            && ticket.TryGetProperty("details", out var details)
            && details.TryGetProperty("error", out var errorValue)
                ? errorValue.GetString()
                : null;
        return new(error == "DeviceNotRegistered" ? PushSendResult.InvalidToken : PushSendResult.Retry);
    }

    public async Task<IReadOnlyDictionary<string, PushSendResult>> Check(
        IReadOnlyList<string> receiptIds,
        CancellationToken ct
    )
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "--/api/v2/push/getReceipts");
        if (!string.IsNullOrWhiteSpace(accessToken))
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        request.Content = JsonContent.Create(new { ids = receiptIds });
        using var response = await http.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode) return new Dictionary<string, PushSendResult>();
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
        if (!json.RootElement.TryGetProperty("data", out var data) || data.ValueKind != JsonValueKind.Object)
            return new Dictionary<string, PushSendResult>();
        var results = new Dictionary<string, PushSendResult>(StringComparer.Ordinal);
        foreach (var receipt in data.EnumerateObject())
        {
            var status = receipt.Value.TryGetProperty("status", out var statusValue)
                ? statusValue.GetString()
                : null;
            var error = receipt.Value.TryGetProperty("details", out var details)
                && details.TryGetProperty("error", out var errorValue)
                    ? errorValue.GetString()
                    : null;
            results[receipt.Name] = status == "ok"
                ? PushSendResult.Sent
                : error == "DeviceNotRegistered"
                    ? PushSendResult.InvalidToken
                    : PushSendResult.Retry;
        }
        return results;
    }
}

public sealed class FirebasePushSender : IPushSender
{
    private readonly HttpClient http;
    private readonly GoogleCredential credential;
    private readonly string projectId;
    private FirebasePushSender(HttpClient http, GoogleCredential credential, string projectId) =>
        (this.http, this.credential, this.projectId) = (http, credential, projectId);
    public bool IsConfigured => true;
    public async Task<PushSendOutcome> Send(PushDevice device, UserNotification notification, CancellationToken ct)
    {
        var accessToken = await ((ITokenAccess)credential).GetAccessTokenForRequestAsync(cancellationToken: ct);
        using var request = new HttpRequestMessage(HttpMethod.Post, $"https://fcm.googleapis.com/v1/projects/{Uri.EscapeDataString(projectId)}/messages:send");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        request.Content = JsonContent.Create(new { message = new { token = device.Token, notification = new { title = notification.Title, body = notification.Body }, data = new { type = notification.Type, resourceId = notification.ResourceId ?? "" } } });
        using var response = await http.SendAsync(request, ct);
        if (response.IsSuccessStatusCode) return new(PushSendResult.Sent);
        if (response.StatusCode is HttpStatusCode.BadRequest or HttpStatusCode.NotFound) return new(PushSendResult.InvalidToken);
        return new(PushSendResult.Retry);
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
            var profile = await store.Profile(notification.UserId, ct);
            if (!profile.NotificationsEnabled)
            {
                await store.MarkPushResult(notification.Id, false, false, time.GetUtcNow(), ct);
                continue;
            }
            var devices = await store.PushDevices(notification.UserId, ct);
            if (devices.Count == 0) { await store.MarkPushResult(notification.Id, false, false, time.GetUtcNow(), ct); continue; }
            var results = new List<PushSendResult>();
            foreach (var device in devices)
            {
                var outcome = await sender.Send(device, notification, ct);
                results.Add(outcome.Result);
                if (outcome.Result == PushSendResult.InvalidToken) await store.DeactivatePushDevice(device.Id, ct);
                if (!string.IsNullOrWhiteSpace(outcome.ReceiptId))
                    await store.AddPushReceipt(new PushReceipt
                    {
                        NotificationId = notification.Id,
                        DeviceId = device.Id,
                        TicketId = outcome.ReceiptId,
                        CheckAfter = time.GetUtcNow().AddMinutes(15),
                    }, ct);
            }
            var sent = results.Any(r => r == PushSendResult.Sent);
            await store.MarkPushResult(notification.Id, sent, !sent && results.Any(r => r == PushSendResult.Retry), time.GetUtcNow(), ct);
            if (sent) delivered++;
        }
        return delivered;
    }
}

public sealed class PushReceiptProcessor(
    IWorkspaceStore store,
    IPushReceiptChecker checker,
    TimeProvider time
)
{
    public async Task<int> RunOnce(CancellationToken ct)
    {
        if (!checker.IsConfigured) return 0;
        var receipts = await store.ClaimPushReceipts(1000, time.GetUtcNow(), TimeSpan.FromMinutes(5), ct);
        if (receipts.Count == 0) return 0;
        var results = await checker.Check(receipts.Select(r => r.TicketId).ToArray(), ct);
        foreach (var receipt in receipts)
        {
            var result = results.GetValueOrDefault(receipt.TicketId, PushSendResult.Retry);
            if (result == PushSendResult.InvalidToken)
                await store.DeactivatePushDevice(receipt.DeviceId, ct);
            await store.CompletePushReceipt(
                receipt.Id,
                result == PushSendResult.Sent
                    ? "delivered"
                    : result == PushSendResult.InvalidToken
                        ? "invalid_device"
                        : receipt.Attempts >= 5
                            ? "failed"
                            : "pending",
                result == PushSendResult.Retry ? "receipt_unavailable_or_provider_error" : null,
                time.GetUtcNow(),
                ct
            );
        }
        return receipts.Count;
    }
}
