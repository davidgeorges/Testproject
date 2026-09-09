using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using SubscriptionApp.Application;
using SubscriptionApp.Domain;

namespace SubscriptionApp.Api;

public sealed class TinkBankingProvider(HttpClient http, IConfiguration configuration, TinkLinkOptions link) : IBankingProvider
{
    private readonly string clientId = configuration["Tink:ClientId"]!;
    private readonly string clientSecret = configuration["Tink:ClientSecret"]!;
    public string LinkUrl { get; } = link.Url;
    public bool IsConfigured => true;
    public IReadOnlySet<string> SupportedBanks { get; } = new HashSet<string> { "Tink" };

    public Task<BankConnection> CreateConnection(string userId, string bankName, CancellationToken ct) =>
        Task.FromResult(new BankConnection { UserId = userId, BankName = bankName, Provider = "tink", AuthorizationUrl = LinkUrl });

    public async Task<BankConnection> CompleteConnection(string userId, string code, string? credentialsId, CancellationToken ct)
    {
        try
        {
            using var response = await http.PostAsync("/api/v1/oauth/token", new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["client_id"] = clientId, ["client_secret"] = clientSecret, ["code"] = code,
                ["grant_type"] = "authorization_code",
            }), ct);
            var body = await response.Content.ReadAsStringAsync(ct);
            if (!response.IsSuccessStatusCode)
                throw new TinkBankingException("TINK_TOKEN_EXCHANGE_FAILED", "Tink a refusé le code. Vérifiez le Client Secret dans Render puis recommencez la connexion.");
            using var json = JsonDocument.Parse(body);
            if (!json.RootElement.TryGetProperty("access_token", out var accessToken) || string.IsNullOrWhiteSpace(accessToken.GetString()))
                throw new TinkBankingException("TINK_TOKEN_MISSING", "Tink n’a retourné aucun jeton d’accès.");
            return new BankConnection
            {
                UserId = userId, BankName = "Banque connectée via Tink", Provider = "tink",
                ExternalConnectionId = Protect(accessToken.GetString()!), Status = "connected",
                ConsentExpiresAt = DateTimeOffset.UtcNow.AddDays(90), AuthorizationUrl = null,
            };
        }
        catch (TinkBankingException) { throw; }
        catch (Exception exception) when (exception is HttpRequestException or JsonException or CryptographicException)
        {
            throw new TinkBankingException("TINK_TOKEN_RESPONSE_INVALID", "La réponse d’authentification Tink est invalide. Recommencez la connexion.");
        }
    }

    public async Task<IReadOnlyList<BankTransaction>> FetchTransactions(BankConnection connection, CancellationToken ct)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/data/v2/transactions?pageSize=100");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", Unprotect(connection.ExternalConnectionId!));
        using var response = await http.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
        {
            var code = $"TINK_TRANSACTIONS_{(int)response.StatusCode}";
            var message = response.StatusCode switch
            {
                System.Net.HttpStatusCode.Unauthorized => "Le jeton Tink a expiré. Reconnectez la banque.",
                System.Net.HttpStatusCode.Forbidden => "Tink n’a pas accordé le droit transactions:read à cette connexion.",
                System.Net.HttpStatusCode.NotFound => "L’API Transactions Tink n’est pas activée pour cette application.",
                _ => $"Tink a refusé la lecture des transactions (HTTP {(int)response.StatusCode}).",
            };
            throw new TinkBankingException(code, message);
        }
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
        var items = json.RootElement.TryGetProperty("transactions", out var rows) ? rows : json.RootElement;
        var result = new List<BankTransaction>();
        foreach (var row in items.EnumerateArray())
        {
            var id = Text(row, "id") ?? Guid.NewGuid().ToString("N");
            var dateText = Text(row, "bookedDateTime") ?? Text(row, "dates", "booked") ?? Text(row, "date") ?? DateTimeOffset.UtcNow.ToString("O");
            _ = DateOnly.TryParse(dateText.Length >= 10 ? dateText[..10] : dateText, out var date);
            result.Add(new BankTransaction
            {
                UserId = connection.UserId, ConnectionId = connection.Id, Provider = "tink", ExternalId = id,
                AccountKey = Text(row, "accountId") ?? "tink", BookedAt = date == default ? DateOnly.FromDateTime(DateTime.UtcNow) : date,
                Amount = Amount(row), Currency = Text(row, "amount", "currencyCode") ?? Text(row, "currencyDenominatedAmount", "currencyCode") ?? Text(row, "currencyCode") ?? "EUR",
                MerchantName = Text(row, "merchantInformation", "merchantName") ?? Text(row, "descriptions", "display") ?? Text(row, "descriptions", "original") ?? Text(row, "description") ?? "Transaction",
                Category = Text(row, "enrichedData", "categories", "pfm", "id") ?? Text(row, "categoryId") ?? "other",
            });
        }
        return result;
    }

    public Task RevokeConnection(BankConnection connection, CancellationToken ct) => Task.CompletedTask;

    private string Protect(string value)
    {
        var key = SHA256.HashData(Encoding.UTF8.GetBytes(clientSecret));
        var nonce = RandomNumberGenerator.GetBytes(12); var plain = Encoding.UTF8.GetBytes(value); var cipher = new byte[plain.Length]; var tag = new byte[16];
        using var aes = new AesGcm(key, 16); aes.Encrypt(nonce, plain, cipher, tag);
        return Convert.ToBase64String([.. nonce, .. tag, .. cipher]);
    }
    private string Unprotect(string value)
    {
        var bytes = Convert.FromBase64String(value); var key = SHA256.HashData(Encoding.UTF8.GetBytes(clientSecret)); var plain = new byte[bytes.Length - 28];
        using var aes = new AesGcm(key, 16); aes.Decrypt(bytes[..12], bytes[12..28], bytes[28..], plain); return Encoding.UTF8.GetString(plain);
    }
    private static string? Text(JsonElement value, string property) => value.TryGetProperty(property, out var p) && p.ValueKind == JsonValueKind.String ? p.GetString() : null;
    private static string? Text(JsonElement value, string parent, string property) => value.TryGetProperty(parent, out var p) ? Text(p, property) : null;
    private static string? Text(JsonElement value, string a, string b, string c, string d) => value.TryGetProperty(a, out var p) && p.TryGetProperty(b, out p) && p.TryGetProperty(c, out p) ? Text(p, d) : null;
    private static decimal Number(JsonElement value, string property) => value.TryGetProperty(property, out var p) && p.TryGetDecimal(out var number) ? number : 0m;
    private static decimal Amount(JsonElement row)
    {
        if (!row.TryGetProperty("amount", out var amount)) return 0m;
        if (amount.TryGetDecimal(out var legacy)) return legacy;
        if (!amount.TryGetProperty("value", out var value)) return 0m;
        var unscaledText = Text(value, "unscaledValue");
        var scaleText = Text(value, "scale");
        if (!decimal.TryParse(unscaledText, System.Globalization.NumberStyles.Integer, System.Globalization.CultureInfo.InvariantCulture, out var unscaled)) return 0m;
        if (!int.TryParse(scaleText, out var scale)) scale = 0;
        return unscaled / (decimal)Math.Pow(10, scale);
    }
}

public sealed class TinkBankingException(string code, string userMessage) : Exception(code)
{
    public string Code { get; } = code;
    public string UserMessage { get; } = userMessage;
}
