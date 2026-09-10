using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SubscriptionApp.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBankProviderSecret : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ProviderSecret",
                table: "bank_connections",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ProviderSecret",
                table: "bank_connections");
        }
    }
}
