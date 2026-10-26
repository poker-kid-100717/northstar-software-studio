using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Northstar.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ServiceProducts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Slug = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    Category = table.Column<string>(type: "text", nullable: false),
                    PriceCents = table.Column<int>(type: "integer", nullable: false),
                    Scope = table.Column<string>(type: "text", nullable: false),
                    Exclusions = table.Column<string>(type: "text", nullable: false),
                    EstimatedHours = table.Column<decimal>(type: "numeric(7,2)", precision: 7, scale: 2, nullable: false),
                    RequiredInputs = table.Column<string>(type: "text", nullable: false),
                    Deliverables = table.Column<string>(type: "text", nullable: false),
                    RevisionAllowance = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    MaximumAcceptedWorkload = table.Column<int>(type: "integer", nullable: false),
                    TurnaroundBusinessDays = table.Column<int>(type: "integer", nullable: false),
                    PaymentEligible = table.Column<bool>(type: "boolean", nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ServiceProducts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ServiceOrders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ServiceProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerName = table.Column<string>(type: "text", nullable: false),
                    CustomerEmail = table.Column<string>(type: "text", nullable: false),
                    ProblemDescription = table.Column<string>(type: "text", nullable: false),
                    ReproductionSteps = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    PaymentStatus = table.Column<string>(type: "text", nullable: false),
                    PaymentEnvironment = table.Column<string>(type: "text", nullable: false),
                    PriceCents = table.Column<int>(type: "integer", nullable: false),
                    ReservationExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    StripeCheckoutSessionId = table.Column<string>(type: "text", nullable: true),
                    RequiresPaymentReview = table.Column<bool>(type: "boolean", nullable: false),
                    ProcessingFeesCents = table.Column<int>(type: "integer", nullable: false),
                    RefundedCents = table.Column<int>(type: "integer", nullable: false),
                    ActualHours = table.Column<decimal>(type: "numeric(9,2)", precision: 9, scale: 2, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ServiceOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ServiceOrders_ServiceProducts_ServiceProductId",
                        column: x => x.ServiceProductId,
                        principalTable: "ServiceProducts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OrderAttachments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ServiceOrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    PrivateStorageKey = table.Column<string>(type: "text", nullable: false),
                    OriginalFilename = table.Column<string>(type: "text", nullable: false),
                    ContentType = table.Column<string>(type: "text", nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderAttachments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrderAttachments_ServiceOrders_ServiceOrderId",
                        column: x => x.ServiceOrderId,
                        principalTable: "ServiceOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OrderDeliverables",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ServiceOrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    PrivateStorageKey = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderDeliverables", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrderDeliverables_ServiceOrders_ServiceOrderId",
                        column: x => x.ServiceOrderId,
                        principalTable: "ServiceOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OrderRevisions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ServiceOrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    Request = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderRevisions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrderRevisions_ServiceOrders_ServiceOrderId",
                        column: x => x.ServiceOrderId,
                        principalTable: "ServiceOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OrderStatusHistory",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ServiceOrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    FromStatus = table.Column<string>(type: "text", nullable: false),
                    ToStatus = table.Column<string>(type: "text", nullable: false),
                    Actor = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderStatusHistory", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrderStatusHistory_ServiceOrders_ServiceOrderId",
                        column: x => x.ServiceOrderId,
                        principalTable: "ServiceOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PaymentTransactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ServiceOrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    Provider = table.Column<string>(type: "text", nullable: false),
                    ProviderEventId = table.Column<string>(type: "text", nullable: false),
                    ProviderPaymentId = table.Column<string>(type: "text", nullable: false),
                    Environment = table.Column<string>(type: "text", nullable: false),
                    AmountCents = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PaymentTransactions_ServiceOrders_ServiceOrderId",
                        column: x => x.ServiceOrderId,
                        principalTable: "ServiceOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OrderAttachments_ServiceOrderId",
                table: "OrderAttachments",
                column: "ServiceOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderDeliverables_ServiceOrderId",
                table: "OrderDeliverables",
                column: "ServiceOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderRevisions_ServiceOrderId",
                table: "OrderRevisions",
                column: "ServiceOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderStatusHistory_ServiceOrderId_CreatedAt",
                table: "OrderStatusHistory",
                columns: new[] { "ServiceOrderId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTransactions_Provider_ProviderEventId",
                table: "PaymentTransactions",
                columns: new[] { "Provider", "ProviderEventId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTransactions_ServiceOrderId",
                table: "PaymentTransactions",
                column: "ServiceOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceOrders_CustomerEmail",
                table: "ServiceOrders",
                column: "CustomerEmail");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceOrders_ServiceProductId",
                table: "ServiceOrders",
                column: "ServiceProductId");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceOrders_Status_CreatedAt",
                table: "ServiceOrders",
                columns: new[] { "Status", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ServiceOrders_StripeCheckoutSessionId",
                table: "ServiceOrders",
                column: "StripeCheckoutSessionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ServiceProducts_IsActive_DisplayOrder",
                table: "ServiceProducts",
                columns: new[] { "IsActive", "DisplayOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_ServiceProducts_Slug",
                table: "ServiceProducts",
                column: "Slug",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OrderAttachments");

            migrationBuilder.DropTable(
                name: "OrderDeliverables");

            migrationBuilder.DropTable(
                name: "OrderRevisions");

            migrationBuilder.DropTable(
                name: "OrderStatusHistory");

            migrationBuilder.DropTable(
                name: "PaymentTransactions");

            migrationBuilder.DropTable(
                name: "ServiceOrders");

            migrationBuilder.DropTable(
                name: "ServiceProducts");
        }
    }
}
