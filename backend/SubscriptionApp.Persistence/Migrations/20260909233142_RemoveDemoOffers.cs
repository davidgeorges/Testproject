using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace SubscriptionApp.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RemoveDemoOffers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "offers",
                keyColumn: "Id",
                keyValue: "insurance-demo");

            migrationBuilder.DeleteData(
                table: "offers",
                keyColumn: "Id",
                keyValue: "internet-demo");

            migrationBuilder.DeleteData(
                table: "offers",
                keyColumn: "Id",
                keyValue: "mobile-demo");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "offers",
                columns: new[] { "Id", "Active", "Assumptions", "Benefits", "Category", "IsPartner", "MonthlyPrice", "ProviderName", "SetupFee", "UpdatedAt", "Url" },
                values: new object[,]
                {
                    { "insurance-demo", true, new[] { "Garanties, franchises et profil conducteur à comparer.", "Catalogue fictif : aucun tarif commercial vérifié." }, new[] { "Exemple de contrat automobile" }, "insurance", true, 49m, "Offre assurance démo", 0m, new DateTimeOffset(new DateTime(2026, 9, 8, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), null },
                    { "internet-demo", true, new[] { "Éligibilité du logement inconnue.", "Catalogue fictif : aucun tarif commercial vérifié." }, new[] { "Exemple de connexion fibre", "39 € de mise en service" }, "internet", true, 29.99m, "Offre fibre démo", 39m, new DateTimeOffset(new DateTime(2026, 9, 8, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), null },
                    { "mobile-demo", true, new[] { "Catalogue fictif : aucun tarif commercial vérifié." }, new[] { "Sans engagement", "Exemple de forfait mobile" }, "mobile", true, 14.99m, "Offre mobile démo", 0m, new DateTimeOffset(new DateTime(2026, 9, 8, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), null }
                });
        }
    }
}
