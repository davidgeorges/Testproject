using Microsoft.EntityFrameworkCore;
using SubscriptionApp.Application;
using SubscriptionApp.Domain;

namespace SubscriptionApp.Persistence;

public sealed class PostgresOfferCatalog(WorkspaceDbContext db) : IOfferCatalog
{
    public async Task<IReadOnlyList<Offer>> GetOffers(CancellationToken ct) =>
        (await db.Offers.AsNoTracking().OrderBy(o => o.Category).ToListAsync(ct))
            .Select(o => o.ToOffer())
            .ToArray();

    public async Task<Offer> SaveOffer(Offer offer, CancellationToken ct)
    {
        var entity = await db.Offers.FindAsync([offer.Id], ct);
        if (entity is null)
        {
            entity = new() { Id = offer.Id };
            db.Offers.Add(entity);
        }
        entity.Category = offer.Category;
        entity.ProviderName = offer.ProviderName;
        entity.MonthlyPrice = offer.MonthlyPrice;
        entity.SetupFee = offer.SetupFee;
        entity.Benefits = offer.Benefits;
        entity.Assumptions = offer.Assumptions;
        entity.Active = offer.Active;
        entity.IsPartner = offer.IsPartner;
        entity.Url = offer.Url;
        entity.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return entity.ToOffer();
    }

    public async Task<bool> DeactivateOffer(string id, CancellationToken ct) =>
        await db.Offers.Where(o => o.Id == id).ExecuteUpdateAsync(
            setters => setters
                .SetProperty(o => o.Active, false)
                .SetProperty(o => o.UpdatedAt, DateTimeOffset.UtcNow),
            ct
        ) > 0;
}
