using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SubscriptionApp.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBankAccounts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "AccountId",
                table: "transactions",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "bank_accounts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ConnectionId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    ExternalAccountId = table.Column<string>(type: "text", nullable: false),
                    AccountType = table.Column<string>(type: "text", nullable: false),
                    MaskedName = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_bank_accounts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_bank_accounts_bank_connections_ConnectionId",
                        column: x => x.ConnectionId,
                        principalTable: "bank_connections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_transactions_AccountId",
                table: "transactions",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_bank_accounts_ConnectionId_ExternalAccountId",
                table: "bank_accounts",
                columns: new[] { "ConnectionId", "ExternalAccountId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_bank_accounts_UserId",
                table: "bank_accounts",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_transactions_bank_accounts_AccountId",
                table: "transactions",
                column: "AccountId",
                principalTable: "bank_accounts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_transactions_bank_accounts_AccountId",
                table: "transactions");

            migrationBuilder.DropTable(
                name: "bank_accounts");

            migrationBuilder.DropIndex(
                name: "IX_transactions_AccountId",
                table: "transactions");

            migrationBuilder.DropColumn(
                name: "AccountId",
                table: "transactions");
        }
    }
}
