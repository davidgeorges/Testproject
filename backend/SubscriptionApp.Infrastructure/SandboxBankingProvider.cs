using SubscriptionApp.Application;
using SubscriptionApp.Domain;

namespace SubscriptionApp.Infrastructure;

public sealed class SandboxBankingProvider(TimeProvider time) : IBankingProvider
{
    public static readonly string[] Banks =
    [
        "Banque démo",
        "Banque Horizon (test)",
        "Banque du quotidien (test)",
    ];
    public bool IsConfigured => true;
    public IReadOnlySet<string> SupportedBanks { get; } = Banks.ToHashSet();

    public Task<BankConnection> CreateConnection(
        string userId,
        string bankName,
        CancellationToken ct
    ) =>
        Task.FromResult(new BankConnection
        {
            UserId = userId,
            BankName = bankName,
            ExternalConnectionId = $"sandbox-{Guid.NewGuid():N}",
        });

    public Task<IReadOnlyList<BankTransaction>> FetchTransactions(
        BankConnection connection,
        CancellationToken ct
    )
    {
        var month = DateOnly.FromDateTime(time.GetUtcNow().UtcDateTime);
        var anchor = new DateOnly(month.Year, month.Month, 1);
        (string merchant, string category, decimal amount)[] services =
        [
            ("Netflix", "streaming", 15.99m),
            ("Spotify", "streaming", 11.99m),
            ("Forfait mobile", "mobile", 34.99m),
            ("Fibre Internet", "internet", 39.99m),
            ("Assurance auto", "insurance", 64.00m),
            ("Salle de sport", "sport", 29.90m),
            ("iCloud+", "cloud", 2.99m),
            ("Adobe", "software", 23.99m),
        ];
        var rows = new List<BankTransaction>();
        for (var i = 0; i < services.Length; i++)
            for (var m = 0; m < 6; m++)
            {
                var date = anchor.AddMonths(-m);
                rows.Add(
                    new BankTransaction
                    {
                        UserId = connection.UserId,
                        ConnectionId = connection.Id,
                        AccountKey = connection.Id.ToString(),
                        ExternalId = $"{connection.Id}:{i}:{date:yyyy-MM}",
                        BookedAt = date,
                        MerchantName = services[i].merchant,
                        Category = services[i].category,
                        Amount = -services[i].amount,
                    }
                );
            }
        return Task.FromResult<IReadOnlyList<BankTransaction>>(rows);
    }

    public Task RevokeConnection(BankConnection connection, CancellationToken ct) =>
        Task.CompletedTask;
}

public sealed class DemoOfferCatalog : IOfferCatalog
{
    private readonly object gate = new();
    private readonly List<Offer> offers =
    [
            new(
                "mobile-demo",
                "mobile",
                "Offre mobile démo",
                14.99m,
                0m,
                ["Sans engagement", "Exemple de forfait mobile"],
                ["Catalogue fictif : aucun tarif commercial vérifié."],
                true,
                true,
                null
            ),
            new(
                "internet-demo",
                "internet",
                "Offre fibre démo",
                29.99m,
                39m,
                ["Exemple de connexion fibre", "39 € de mise en service"],
                [
                    "Éligibilité du logement inconnue.",
                    "Catalogue fictif : aucun tarif commercial vérifié.",
                ],
                true,
                true,
                null
            ),
            new(
                "insurance-demo",
                "insurance",
                "Offre assurance démo",
                49m,
                0m,
                ["Exemple de contrat automobile"],
                [
                    "Garanties, franchises et profil conducteur à comparer.",
                    "Catalogue fictif : aucun tarif commercial vérifié.",
                ],
                true,
                true,
                null
            ),
    ];

    public Task<IReadOnlyList<Offer>> GetOffers(CancellationToken ct)
    {
        lock (gate)
            return Task.FromResult<IReadOnlyList<Offer>>(offers.ToArray());
    }

    public Task<Offer> SaveOffer(Offer offer, CancellationToken ct)
    {
        lock (gate)
        {
            offers.RemoveAll(o => o.Id == offer.Id);
            offers.Add(offer);
        }
        return Task.FromResult(offer);
    }

    public Task<bool> DeactivateOffer(string id, CancellationToken ct)
    {
        lock (gate)
        {
            var index = offers.FindIndex(o => o.Id == id);
            if (index < 0) return Task.FromResult(false);
            offers[index] = offers[index] with { Active = false };
            return Task.FromResult(true);
        }
    }
}
