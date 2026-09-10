using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SubscriptionApp.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProfileAccentColor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AccentColor",
                table: "user_profiles",
                type: "character varying(7)",
                maxLength: 7,
                nullable: false,
                defaultValue: "#70737A");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AccentColor",
                table: "user_profiles");
        }
    }
}
