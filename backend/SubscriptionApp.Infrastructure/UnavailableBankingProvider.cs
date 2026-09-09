using SubscriptionApp.Application;
using SubscriptionApp.Domain;

namespace SubscriptionApp.Infrastructure;

public sealed class UnavailableBankingProvider : IBankingProvider
{
    public bool IsConfigured => false;
    public IReadOnlySet<string> SupportedBanks { get; } = new HashSet<string>();

    public Task<BankConnection> CreateConnection(
        string userId,
        string bankName,
        CancellationToken ct
    ) => throw new InvalidOperationException("No Open Banking provider is configured.");

    public Task<IReadOnlyList<BankTransaction>> FetchTransactions(
        BankConnection connection,
        CancellationToken ct
    ) => throw new InvalidOperationException("No Open Banking provider is configured.");

    public Task RevokeConnection(BankConnection connection, CancellationToken ct) =>
        throw new InvalidOperationException("No Open Banking provider is configured.");
}
