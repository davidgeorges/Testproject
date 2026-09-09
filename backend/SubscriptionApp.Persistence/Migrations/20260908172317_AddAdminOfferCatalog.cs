using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace SubscriptionApp.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAdminOfferCatalog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "offers",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Category = table.Column<string>(type: "text", nullable: false),
                    ProviderName = table.Column<string>(type: "text", nullable: false),
                    MonthlyPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    SetupFee = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Benefits = table.Column<string[]>(type: "text[]", nullable: false),
                    Assumptions = table.Column<string[]>(type: "text[]", nullable: false),
                    Active = table.Column<bool>(type: "boolean", nullable: false),
                    IsPartner = table.Column<bool>(type: "boolean", nullable: false),
                    Url = table.Column<string>(type: "text", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_offers", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "offers",
                columns: new[] { "Id", "Active", "Assumptions", "Benefits", "Category", "IsPartner", "MonthlyPrice", "ProviderName", "SetupFee", "UpdatedAt", "Url" },
                values: new object[,]
                {
                    { "insurance-demo", true, new[] { "Garanties, franchises et profil conducteur à comparer.", "Catalogue fictif : aucun tarif commercial vérifié." }, new[] { "Exemple de contrat automobile" }, "insurance", true, 49m, "Offre assurance démo", 0m, new DateTimeOffset(new DateTime(2026, 9, 8, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), null },
                    { "internet-demo", true, new[] { "Éligibilité du logement inconnue.", "Catalogue fictif : aucun tarif commercial vérifié." }, new[] { "Exemple de connexion fibre", "39 € de mise en service" }, "internet", true, 29.99m, "Offre fibre démo", 39m, new DateTimeOffset(new DateTime(2026, 9, 8, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), null },
                    { "mobile-demo", true, new[] { "Catalogue fictif : aucun tarif commercial vérifié." }, new[] { "Sans engagement", "Exemple de forfait mobile" }, "mobile", true, 14.99m, "Offre mobile démo", 0m, new DateTimeOffset(new DateTime(2026, 9, 8, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), null }
                });

            migrationBuilder.CreateIndex(
                name: "IX_offers_Category_Active",
                table: "offers",
                columns: new[] { "Category", "Active" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "offers");
        }
    }
}
