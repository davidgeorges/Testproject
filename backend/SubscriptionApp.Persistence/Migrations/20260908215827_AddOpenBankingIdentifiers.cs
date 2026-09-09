using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SubscriptionApp.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOpenBankingIdentifiers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ExternalConnectionId",
                table: "bank_connections",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_bank_connections_Provider_ExternalConnectionId",
                table: "bank_connections",
                columns: new[] { "Provider", "ExternalConnectionId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_bank_connections_Provider_ExternalConnectionId",
                table: "bank_connections");

            migrationBuilder.DropColumn(
                name: "ExternalConnectionId",
                table: "bank_connections");
        }
    }
}
