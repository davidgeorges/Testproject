using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SubscriptionApp.Persistence.Migrations
{
    public partial class SeedVerifiedOfferCandidates : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "offers",
                columns: new[] { "Id", "Active", "Assumptions", "Benefits", "Category", "IsPartner", "MonthlyPrice", "ProviderName", "SetupFee", "UpdatedAt", "Url" },
                values: new object[,]
                {
                    {
                        "candidate-free-mobile-2eur-2026-03-31", false,
                        new[] { "Tarif public vérifié le 10 septembre 2026 ; à revalider avant activation.", "Le tarif à 0 €/mois est réservé aux abonnés Freebox éligibles.", "Cette fiche n'établit aucun partenariat commercial avec Free." },
                        new[] { "2 h d'appels", "50 Mo", "SMS/MMS illimités", "Sans engagement" },
                        "mobile", false, 2m, "Free Mobile — Forfait 2 €", 10m,
                        new DateTimeOffset(new DateTime(2026, 9, 10, 0, 0, 0, DateTimeKind.Unspecified), TimeSpan.Zero),
                        "https://mobile.free.fr/fiche-forfait-2-euros"
                    },
                    {
                        "candidate-sosh-mobile-100go-2026-09-10", false,
                        new[] { "Tarif public vérifié le 10 septembre 2026 ; à revalider avant activation.", "Offre réservée aux nouvelles souscriptions, hors changement d'offre Orange ou Sosh.", "Cette fiche n'établit aucun partenariat commercial avec Sosh." },
                        new[] { "100 Go en France", "40 Go en Europe et DOM", "Appels/SMS/MMS illimités", "Sans engagement" },
                        "mobile", false, 13.99m, "Sosh — Forfait 100 Go", 10m,
                        new DateTimeOffset(new DateTime(2026, 9, 10, 0, 0, 0, DateTimeKind.Unspecified), TimeSpan.Zero),
                        "https://shop.sosh.fr/mobile/forfait-100go"
                    },
                    {
                        "candidate-byou-mobile-100go-5g-2026-09-10", false,
                        new[] { "Tarif public vérifié le 10 septembre 2026 ; à revalider avant activation.", "Les frais et le volume de données à l'étranger doivent être revérifiés lors de l'activation.", "Cette fiche n'établit aucun partenariat commercial avec Bouygues Telecom." },
                        new[] { "100 Go en 5G", "35 Go en Europe et DOM", "Appels/SMS/MMS illimités", "Sans engagement" },
                        "mobile", false, 13.99m, "B&You — Forfait 100 Go 5G", 2m,
                        new DateTimeOffset(new DateTime(2026, 9, 10, 0, 0, 0, DateTimeKind.Unspecified), TimeSpan.Zero),
                        "https://www.bouyguestelecom.fr/forfaits-mobiles/sans-engagement"
                    }
                });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "offers",
                keyColumn: "Id",
                keyValues: new object[]
                {
                    "candidate-free-mobile-2eur-2026-03-31",
                    "candidate-sosh-mobile-100go-2026-09-10",
                    "candidate-byou-mobile-100go-5g-2026-09-10"
                });
        }
    }
}
