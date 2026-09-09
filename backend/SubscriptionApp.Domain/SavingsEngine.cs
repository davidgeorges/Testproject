namespace SubscriptionApp.Domain;

public sealed class SavingsEngine
{
    private static readonly HashSet<string> SupportedCategories =
    [
        "mobile",
        "internet",
        "insurance",
        "energy",
    ];

    public IReadOnlyList<Recommendation> Calculate(
        IEnumerable<Payment> payments,
        IEnumerable<Offer> offers
    )
    {
        var results = new List<Recommendation>();
        foreach (var payment in payments.Where(p => SupportedCategories.Contains(p.Category)))
        {
            var candidates = Alternatives(payment, offers);
            if (candidates.Count > 0) results.Add(candidates[0]);
        }
        return results.OrderByDescending(r => r.AnnualSaving).ToArray();
    }

    public IReadOnlyList<Recommendation> Alternatives(Payment payment, IEnumerable<Offer> offers)
    {
        if (!SupportedCategories.Contains(payment.Category)) return [];
        return offers
                .Where(o =>
                    o.Active
                    && o.Category == payment.Category
                    && o.MonthlyPrice >= 0
                    && o.SetupFee >= 0
                )
                .Select(o => (Offer: o, Saving: decimal.Round((payment.MonthlyCost - o.MonthlyPrice) * 12 - o.SetupFee, 2)))
                .Where(candidate => candidate.Saving > 0)
                .OrderByDescending(candidate => candidate.Saving)
                .Select(candidate => new Recommendation(
                    $"{payment.Id}-{candidate.Offer.Id}",
                    payment.Id,
                    payment.Merchant,
                    payment.Category,
                    payment.MonthlyCost,
                    candidate.Offer.MonthlyPrice,
                    candidate.Saving,
                    "LOW",
                    $"Votre coût mensuel moyen observé est de {payment.MonthlyCost:F2} €. Cette offre pourrait réduire ce coût, sous réserve de vérifier qu’elle répond à vos besoins.",
                    candidate.Offer.Assumptions.Concat(
                    new[]
                    {
                        "Estimation sur 12 mois, prix de l’offre supposé constant.",
                        "Usage, éligibilité et garanties à vérifier : ces informations ne sont pas connues.",
                        "Hors éventuels frais de résiliation du contrat actuel. Les frais de mise en service de l’offre sont inclus.",
                    }
                    ).ToArray(),
                    candidate.Offer
                ))
                .ToArray();
    }
}
