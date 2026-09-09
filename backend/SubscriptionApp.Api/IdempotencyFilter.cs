using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Json;
using SubscriptionApp.Application;

namespace SubscriptionApp.Api;

public sealed class IdempotencyFilter(IIdempotencyStore store, TimeProvider time) : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var http = context.HttpContext;
        var key = http.Request.Headers["Idempotency-Key"].ToString();
        if (key.Length is < 8 or > 128)
            return Results.BadRequest(new { code = "IDEMPOTENCY_KEY_REQUIRED", message = "Une clé d’idempotence de 8 à 128 caractères est requise.", correlationId = http.TraceIdentifier });

        var rawCacheKey = $"{http.User.FindFirstValue(ClaimTypes.NameIdentifier)}:{http.Request.Method}:{http.Request.Path}:{key}";
        var cacheKey = Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(rawCacheKey)));
        var requestBody = context.Arguments.FirstOrDefault(a => a is CreateConnectionRequest or TinkCallbackRequest or PurchaseVerificationRequest);
        var fingerprint = Convert.ToHexString(SHA256.HashData(requestBody is null ? [] : JsonSerializer.SerializeToUtf8Bytes(requestBody, requestBody.GetType())));
        var expiresAt = time.GetUtcNow().AddHours(24);

        for (var attempt = 0; attempt < 20; attempt++)
        {
            var decision = await store.Begin(cacheKey, fingerprint, expiresAt, http.RequestAborted);
            if (decision.State == IdempotencyState.Conflict)
                return Results.Conflict(new { code = "IDEMPOTENCY_CONFLICT", message = "Cette clé a déjà été utilisée pour une autre demande.", correlationId = http.TraceIdentifier });
            if (decision.State == IdempotencyState.Completed)
                return decision.ResponseBody is null
                    ? Results.StatusCode(decision.StatusCode!.Value)
                    : Results.Content(decision.ResponseBody, "application/json", statusCode: decision.StatusCode!.Value);
            if (decision.State == IdempotencyState.Pending)
            {
                await Task.Delay(50, http.RequestAborted);
                continue;
            }

            try
            {
                var result = await next(context);
                if (result is IStatusCodeHttpResult status && status.StatusCode is >= 200 and < 300)
                {
                    var body = result is IValueHttpResult value && value.Value is not null
                        ? JsonSerializer.Serialize(value.Value, value.Value.GetType(), new JsonSerializerOptions(JsonSerializerDefaults.Web))
                        : null;
                    await store.Complete(cacheKey, fingerprint, status.StatusCode.Value, body, http.RequestAborted);
                }
                else await store.Abandon(cacheKey, fingerprint, http.RequestAborted);
                return result;
            }
            catch
            {
                await store.Abandon(cacheKey, fingerprint, CancellationToken.None);
                throw;
            }
        }

        return Results.Conflict(new { code = "IDEMPOTENCY_REQUEST_IN_PROGRESS", message = "Une demande identique est déjà en cours. Réessayez dans quelques instants.", correlationId = http.TraceIdentifier });
    }
}
