using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using SubscriptionApp.Application;

namespace SubscriptionApp.Infrastructure;

public sealed class DeterministicRecommendationExplainer : IRecommendationExplainer
{
    public Task<string> Explain(RecommendationFacts facts, string deterministicFallback, CancellationToken ct) => Task.FromResult(deterministicFallback);
}

public sealed class OpenAiRecommendationExplainer(HttpClient http, string apiKey, string model, ILogger<OpenAiRecommendationExplainer> logger) : IRecommendationExplainer
{
    public const string PromptVersion = "recommendation-explanation-v1";
    public OpenAiRecommendationExplainer(HttpClient http, string apiKey, string model) : this(http, apiKey, model, NullLogger<OpenAiRecommendationExplainer>.Instance) { }
    public async Task<string> Explain(RecommendationFacts facts, string fallback, CancellationToken ct)
    {
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/responses");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            request.Content = JsonContent.Create(new
            {
                model,
                store = false,
                max_output_tokens = 100,
                instructions = $"Prompt {PromptVersion}. Reformule en français en une phrase courte. Utilise uniquement les faits JSON. N’ajoute aucun nombre, prix, promesse, conseil financier ou fait externe.",
                input = JsonSerializer.Serialize(facts),
                text = new { format = new { type = "json_schema", name = "recommendation_explanation", strict = true, schema = new { type = "object", properties = new { explanation = new { type = "string" } }, required = new[] { "explanation" }, additionalProperties = false } } },
            });
            using var response = await http.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode) return fallback;
            using var document = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
            var structuredText = document.RootElement.GetProperty("output").EnumerateArray()
                .SelectMany(item => item.TryGetProperty("content", out var content) ? content.EnumerateArray().ToArray() : [])
                .Where(content => content.TryGetProperty("type", out var type) && type.GetString() == "output_text")
                .Select(content => content.GetProperty("text").GetString()).FirstOrDefault();
            if (string.IsNullOrWhiteSpace(structuredText)) return fallback;
            using var structured = JsonDocument.Parse(structuredText);
            var text = structured.RootElement.GetProperty("explanation").GetString();
            if (!IsSafe(text)) return fallback;
            logger.LogInformation("Recommendation explanation generated with model {Model} and prompt {PromptVersion}", model, PromptVersion);
            return text!.Trim();
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { throw; }
        catch (Exception exception) { logger.LogWarning(exception, "Recommendation explanation generation failed with model {Model} and prompt {PromptVersion}", model, PromptVersion); return fallback; }
    }

    private static bool IsSafe(string? text) => !string.IsNullOrWhiteSpace(text) && text.Length <= 500 && !text.Any(char.IsDigit) && !text.Contains('€') && !text.Contains('$');
}
