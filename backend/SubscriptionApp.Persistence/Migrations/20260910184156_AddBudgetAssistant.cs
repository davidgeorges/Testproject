using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SubscriptionApp.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBudgetAssistant : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsInternalTransfer",
                table: "transactions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.Sql("""
                UPDATE transactions
                SET "IsInternalTransfer" = TRUE
                WHERE "Category" ILIKE '%internal_transfer%'
                   OR "Category" ILIKE '%account_transfer%'
                   OR "MerchantName" ILIKE '%virement interne%'
                   OR "MerchantName" ILIKE '%transfert interne%'
                   OR "MerchantName" ILIKE '%transfert entre compte%'
                   OR "MerchantName" ILIKE '%internal transfer%';
                """);

            migrationBuilder.CreateTable(
                name: "category_budgets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    Category = table.Column<string>(type: "text", nullable: false),
                    MonthlyLimit = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    CategoryType = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_category_budgets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_category_budgets_user_profiles_UserId",
                        column: x => x.UserId,
                        principalTable: "user_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "transaction_category_rules",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    TransactionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Category = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_transaction_category_rules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_transaction_category_rules_transactions_TransactionId",
                        column: x => x.TransactionId,
                        principalTable: "transactions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_transaction_category_rules_user_profiles_UserId",
                        column: x => x.UserId,
                        principalTable: "user_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_category_budgets_UserId_Category",
                table: "category_budgets",
                columns: new[] { "UserId", "Category" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_transaction_category_rules_TransactionId",
                table: "transaction_category_rules",
                column: "TransactionId");

            migrationBuilder.CreateIndex(
                name: "IX_transaction_category_rules_UserId_Category",
                table: "transaction_category_rules",
                columns: new[] { "UserId", "Category" });

            migrationBuilder.CreateIndex(
                name: "IX_transaction_category_rules_UserId_TransactionId",
                table: "transaction_category_rules",
                columns: new[] { "UserId", "TransactionId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "category_budgets");

            migrationBuilder.DropTable(
                name: "transaction_category_rules");

            migrationBuilder.DropColumn(
                name: "IsInternalTransfer",
                table: "transactions");
        }
    }
}
