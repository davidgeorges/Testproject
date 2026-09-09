using System.Net;
using System.Text;
using System.Text.Json;
using SubscriptionApp.Application;
using SubscriptionApp.Infrastructure;
using Xunit;

namespace SubscriptionApp.Tests;

public sealed class RecommendationExplainerTests
{
    [Fact]
    public async Task OpenAiExplainerSendsOnlyFactsWithoutStorageAndAcceptsSafeText()
    {
        string? requestBody = null;
        using var http = new HttpClient(new StubHandler(async request =>
        {
            requestBody = await request.Content!.ReadAsStringAsync();
            return Json("{\"output\":[{\"content\":[{\"type\":\"output_text\",\"text\":\"{\\\"explanation\\\":\\\"Cette alternative réduit le coût selon les hypothèses indiquées.\\\"}\"}]}]}");
        }));
        var explainer = new OpenAiRecommendationExplainer(http, "test-key", "test-model");
        var result = await explainer.Explain(new("mobile", 30m, 20m, 120m, "low", ["Éligibilité inconnue"]), "fallback", default);
        Assert.StartsWith("Cette alternative", result);
        using var body = JsonDocument.Parse(requestBody!);
        Assert.False(body.RootElement.GetProperty("store").GetBoolean());
        Assert.DoesNotContain("UserId", requestBody);
    }

    [Fact]
    public async Task OpenAiExplainerRejectsUncontrolledNumericClaim()
    {
        using var http = new HttpClient(new StubHandler(_ => Task.FromResult(Json("{\"output\":[{\"content\":[{\"type\":\"output_text\",\"text\":\"{\\\"explanation\\\":\\\"Économisez 999 euros.\\\"}\"}]}]}"))));
        var explainer = new OpenAiRecommendationExplainer(http, "test-key", "test-model");
        Assert.Equal("fallback", await explainer.Explain(new("mobile", 30m, 20m, 120m, "low", []), "fallback", default));
    }

    private static HttpResponseMessage Json(string value) => new(HttpStatusCode.OK) { Content = new StringContent(value, Encoding.UTF8, "application/json") };
    private sealed class StubHandler(Func<HttpRequestMessage, Task<HttpResponseMessage>> handler) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) => handler(request);
    }
}
