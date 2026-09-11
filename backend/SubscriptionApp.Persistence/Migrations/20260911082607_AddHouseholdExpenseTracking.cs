using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SubscriptionApp.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddHouseholdExpenseTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "CanManageAssets",
                table: "household_members",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanManageBudgets",
                table: "household_members",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanManageContracts",
                table: "household_members",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "SourceDocumentId",
                table: "household_contracts",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SourceId",
                table: "deadlines",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SourceType",
                table: "deadlines",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "manual");

            migrationBuilder.Sql("UPDATE household_members SET \"CanManageBudgets\" = TRUE, \"CanManageAssets\" = TRUE, \"CanManageContracts\" = TRUE WHERE \"AccountStatus\" = 'owner';");

            migrationBuilder.CreateTable(
                name: "household_expenses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                    BudgetId = table.Column<Guid>(type: "uuid", nullable: true),
                    BankTransactionId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedByUserId = table.Column<string>(type: "text", nullable: false),
                    Title = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Category = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    OccurredOn = table.Column<DateOnly>(type: "date", nullable: false),
                    Source = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_household_expenses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_household_expenses_household_budgets_BudgetId",
                        column: x => x.BudgetId,
                        principalTable: "household_budgets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_household_expenses_households_HouseholdId",
                        column: x => x.HouseholdId,
                        principalTable: "households",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_household_expenses_transactions_BankTransactionId",
                        column: x => x.BankTransactionId,
                        principalTable: "transactions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_household_expenses_user_profiles_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "user_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "household_expense_splits",
                columns: table => new
                {
                    ExpenseId = table.Column<Guid>(type: "uuid", nullable: false),
                    MemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_household_expense_splits", x => new { x.ExpenseId, x.MemberId });
                    table.ForeignKey(
                        name: "FK_household_expense_splits_household_expenses_ExpenseId",
                        column: x => x.ExpenseId,
                        principalTable: "household_expenses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_household_expense_splits_household_members_MemberId",
                        column: x => x.MemberId,
                        principalTable: "household_members",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_household_contracts_SourceDocumentId",
                table: "household_contracts",
                column: "SourceDocumentId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_deadlines_UserId_SourceType_SourceId",
                table: "deadlines",
                columns: new[] { "UserId", "SourceType", "SourceId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_household_expense_splits_MemberId",
                table: "household_expense_splits",
                column: "MemberId");

            migrationBuilder.CreateIndex(
                name: "IX_household_expenses_BankTransactionId",
                table: "household_expenses",
                column: "BankTransactionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_household_expenses_BudgetId",
                table: "household_expenses",
                column: "BudgetId");

            migrationBuilder.CreateIndex(
                name: "IX_household_expenses_CreatedByUserId",
                table: "household_expenses",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_household_expenses_HouseholdId_OccurredOn",
                table: "household_expenses",
                columns: new[] { "HouseholdId", "OccurredOn" });

            migrationBuilder.AddForeignKey(
                name: "FK_household_contracts_documents_SourceDocumentId",
                table: "household_contracts",
                column: "SourceDocumentId",
                principalTable: "documents",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_household_contracts_documents_SourceDocumentId",
                table: "household_contracts");

            migrationBuilder.DropTable(
                name: "household_expense_splits");

            migrationBuilder.DropTable(
                name: "household_expenses");

            migrationBuilder.DropIndex(
                name: "IX_household_contracts_SourceDocumentId",
                table: "household_contracts");

            migrationBuilder.DropIndex(
                name: "IX_deadlines_UserId_SourceType_SourceId",
                table: "deadlines");

            migrationBuilder.DropColumn(
                name: "CanManageAssets",
                table: "household_members");

            migrationBuilder.DropColumn(
                name: "CanManageBudgets",
                table: "household_members");

            migrationBuilder.DropColumn(
                name: "CanManageContracts",
                table: "household_members");

            migrationBuilder.DropColumn(
                name: "SourceDocumentId",
                table: "household_contracts");

            migrationBuilder.DropColumn(
                name: "SourceId",
                table: "deadlines");

            migrationBuilder.DropColumn(
                name: "SourceType",
                table: "deadlines");
        }
    }
}
