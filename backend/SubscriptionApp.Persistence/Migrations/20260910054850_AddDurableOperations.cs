using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SubscriptionApp.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDurableOperations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "ConfirmedAnnualSaving",
                table: "recommendation_events",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "account_deletion_jobs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    Attempts = table.Column<int>(type: "integer", nullable: false),
                    LastError = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_account_deletion_jobs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "push_receipts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    NotificationId = table.Column<Guid>(type: "uuid", nullable: false),
                    DeviceId = table.Column<Guid>(type: "uuid", nullable: false),
                    TicketId = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    Attempts = table.Column<int>(type: "integer", nullable: false),
                    LastError = table.Column<string>(type: "text", nullable: true),
                    CheckAfter = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_push_receipts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_push_receipts_notifications_NotificationId",
                        column: x => x.NotificationId,
                        principalTable: "notifications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_push_receipts_push_devices_DeviceId",
                        column: x => x.DeviceId,
                        principalTable: "push_devices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_account_deletion_jobs_Status_UpdatedAt",
                table: "account_deletion_jobs",
                columns: new[] { "Status", "UpdatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_account_deletion_jobs_UserId",
                table: "account_deletion_jobs",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_push_receipts_DeviceId",
                table: "push_receipts",
                column: "DeviceId");

            migrationBuilder.CreateIndex(
                name: "IX_push_receipts_NotificationId",
                table: "push_receipts",
                column: "NotificationId");

            migrationBuilder.CreateIndex(
                name: "IX_push_receipts_Status_CheckAfter",
                table: "push_receipts",
                columns: new[] { "Status", "CheckAfter" });

            migrationBuilder.CreateIndex(
                name: "IX_push_receipts_TicketId",
                table: "push_receipts",
                column: "TicketId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "account_deletion_jobs");

            migrationBuilder.DropTable(
                name: "push_receipts");

            migrationBuilder.DropColumn(
                name: "ConfirmedAnnualSaving",
                table: "recommendation_events");
        }
    }
}
