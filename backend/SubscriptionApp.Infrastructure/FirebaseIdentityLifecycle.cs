using System.Net.Http.Headers;
using System.Net.Http.Json;
using Google.Apis.Auth.OAuth2;
using SubscriptionApp.Application;

namespace SubscriptionApp.Infrastructure;

public sealed class FirebaseIdentityLifecycle : IIdentityLifecycle
{
    private readonly HttpClient http;
    private readonly GoogleCredential credential;
    private readonly string projectId;
    private FirebaseIdentityLifecycle(HttpClient http, GoogleCredential credential, string projectId) =>
        (this.http, this.credential, this.projectId) = (http, credential, projectId);
    public bool IsConfigured => true;

    public async Task DeleteIdentity(string userId, CancellationToken ct)
    {
        var token = await ((ITokenAccess)credential).GetAccessTokenForRequestAsync(cancellationToken: ct);
        using var request = new HttpRequestMessage(HttpMethod.Post, $"https://identitytoolkit.googleapis.com/v1/projects/{Uri.EscapeDataString(projectId)}/accounts:delete");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        request.Content = JsonContent.Create(new { localId = userId });
        using var response = await http.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();
    }

    public static IIdentityLifecycle Create(HttpClient http, string serviceAccountJson, string projectId)
    {
        var credential = CredentialFactory.FromJson<ServiceAccountCredential>(serviceAccountJson)
            .ToGoogleCredential().CreateScoped("https://www.googleapis.com/auth/cloud-platform");
        return new FirebaseIdentityLifecycle(http, credential, projectId);
    }
}
