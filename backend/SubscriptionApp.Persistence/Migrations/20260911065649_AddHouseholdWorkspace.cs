using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SubscriptionApp.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddHouseholdWorkspace : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "households",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OwnerUserId = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_households", x => x.Id);
                    table.ForeignKey(
                        name: "FK_households_user_profiles_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalTable: "user_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "household_budgets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Category = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    MonthlyLimit = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_household_budgets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_household_budgets_households_HouseholdId",
                        column: x => x.HouseholdId,
                        principalTable: "households",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "household_members",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Relationship = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    BirthDate = table.Column<DateOnly>(type: "date", nullable: true),
                    Email = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: true),
                    LinkedUserId = table.Column<string>(type: "text", nullable: true),
                    AccountStatus = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    AccessRole = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    InvitationTokenHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    InvitationExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_household_members", x => x.Id);
                    table.ForeignKey(
                        name: "FK_household_members_households_HouseholdId",
                        column: x => x.HouseholdId,
                        principalTable: "households",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_household_members_user_profiles_LinkedUserId",
                        column: x => x.LinkedUserId,
                        principalTable: "user_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "household_residences",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Kind = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Address = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_household_residences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_household_residences_households_HouseholdId",
                        column: x => x.HouseholdId,
                        principalTable: "households",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "household_vehicles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Registration = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_household_vehicles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_household_vehicles_households_HouseholdId",
                        column: x => x.HouseholdId,
                        principalTable: "households",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "household_budget_members",
                columns: table => new
                {
                    BudgetId = table.Column<Guid>(type: "uuid", nullable: false),
                    MemberId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_household_budget_members", x => new { x.BudgetId, x.MemberId });
                    table.ForeignKey(
                        name: "FK_household_budget_members_household_budgets_BudgetId",
                        column: x => x.BudgetId,
                        principalTable: "household_budgets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_household_budget_members_household_members_MemberId",
                        column: x => x.MemberId,
                        principalTable: "household_members",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "household_contracts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Category = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Provider = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    MonthlyAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    RenewalDate = table.Column<DateOnly>(type: "date", nullable: true),
                    ResidenceId = table.Column<Guid>(type: "uuid", nullable: true),
                    VehicleId = table.Column<Guid>(type: "uuid", nullable: true),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_household_contracts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_household_contracts_household_residences_ResidenceId",
                        column: x => x.ResidenceId,
                        principalTable: "household_residences",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_household_contracts_household_vehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "household_vehicles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_household_contracts_households_HouseholdId",
                        column: x => x.HouseholdId,
                        principalTable: "households",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "household_contract_members",
                columns: table => new
                {
                    ContractId = table.Column<Guid>(type: "uuid", nullable: false),
                    MemberId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_household_contract_members", x => new { x.ContractId, x.MemberId });
                    table.ForeignKey(
                        name: "FK_household_contract_members_household_contracts_ContractId",
                        column: x => x.ContractId,
                        principalTable: "household_contracts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_household_contract_members_household_members_MemberId",
                        column: x => x.MemberId,
                        principalTable: "household_members",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_household_budget_members_MemberId",
                table: "household_budget_members",
                column: "MemberId");

            migrationBuilder.CreateIndex(
                name: "IX_household_budgets_HouseholdId_Name",
                table: "household_budgets",
                columns: new[] { "HouseholdId", "Name" });

            migrationBuilder.CreateIndex(
                name: "IX_household_contract_members_MemberId",
                table: "household_contract_members",
                column: "MemberId");

            migrationBuilder.CreateIndex(
                name: "IX_household_contracts_HouseholdId_Category",
                table: "household_contracts",
                columns: new[] { "HouseholdId", "Category" });

            migrationBuilder.CreateIndex(
                name: "IX_household_contracts_ResidenceId",
                table: "household_contracts",
                column: "ResidenceId");

            migrationBuilder.CreateIndex(
                name: "IX_household_contracts_VehicleId",
                table: "household_contracts",
                column: "VehicleId");

            migrationBuilder.CreateIndex(
                name: "IX_household_members_HouseholdId_LinkedUserId",
                table: "household_members",
                columns: new[] { "HouseholdId", "LinkedUserId" });

            migrationBuilder.CreateIndex(
                name: "IX_household_members_InvitationTokenHash",
                table: "household_members",
                column: "InvitationTokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_household_members_LinkedUserId",
                table: "household_members",
                column: "LinkedUserId");

            migrationBuilder.CreateIndex(
                name: "IX_household_residences_HouseholdId",
                table: "household_residences",
                column: "HouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_household_vehicles_HouseholdId",
                table: "household_vehicles",
                column: "HouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_households_OwnerUserId",
                table: "households",
                column: "OwnerUserId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "household_budget_members");

            migrationBuilder.DropTable(
                name: "household_contract_members");

            migrationBuilder.DropTable(
                name: "household_budgets");

            migrationBuilder.DropTable(
                name: "household_contracts");

            migrationBuilder.DropTable(
                name: "household_members");

            migrationBuilder.DropTable(
                name: "household_residences");

            migrationBuilder.DropTable(
                name: "household_vehicles");

            migrationBuilder.DropTable(
                name: "households");
        }
    }
}
