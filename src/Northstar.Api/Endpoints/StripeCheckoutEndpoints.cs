using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using Northstar.Api.Data;
using Northstar.Api.Domain;
using Stripe;
using Stripe.Checkout;
namespace Northstar.Api.Endpoints;
public static class StripeCheckoutEndpoints
{
    public sealed record CheckoutRequest(string ProductSlug, string CustomerName, string CustomerEmail, string ProblemDescription, string ReproductionSteps);
    public static IEndpointRouteBuilder MapStripeCheckout(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/checkout", async (CheckoutRequest request, NorthstarDbContext db, IConfiguration cfg, CancellationToken ct) =>
        {
            if (!cfg.GetValue<bool>("Payments:Enabled")) return Results.Problem("Checkout is disabled.", statusCode:503);
            var secret = cfg["Stripe:SecretKey"];
            if (string.IsNullOrWhiteSpace(secret) || !secret.StartsWith("sk_test_", StringComparison.Ordinal)) return Results.Problem("Stripe test-mode configuration required.", statusCode:503);
            if (request.CustomerName?.Length is < 2 or > 100 || !new EmailAddressAttribute().IsValid(request.CustomerEmail) ||
                request.ProblemDescription?.Length is < 20 or > 8000 || request.ReproductionSteps?.Length is < 10 or > 4000)
                return Results.BadRequest(new { error="Invalid intake fields." });
            var product = await db.ServiceProducts.SingleOrDefaultAsync(p=>p.Slug==request.ProductSlug && p.IsActive && p.PaymentEligible,ct);
            if (product is null) return Results.BadRequest(new { error="Product is not currently accepting payments." });
            var limits = cfg.GetSection("Capacity").Get<CapacityOptions>() ?? new CapacityOptions();
            var availability = await CapacityPolicy.CheckAsync(db, product, limits, DateTimeOffset.UtcNow, ct);
            if (!availability.Available) return Results.Conflict(new { error=availability.Reason });
            // Not safe for concurrent capacity reservation yet. Keep disabled until transactional reservation is implemented.
            return Results.Problem("Checkout is not yet enabled: atomic capacity reservations are required.", statusCode:503);
        }).RequireRateLimiting("intake");
        app.MapPost("/api/stripe/webhook", async (HttpRequest request, IConfiguration cfg, NorthstarDbContext db, CancellationToken ct) =>
        {
            var secret=cfg["Stripe:WebhookSecret"];
            if (string.IsNullOrWhiteSpace(secret) || !secret.StartsWith("whsec_",StringComparison.Ordinal)) return Results.StatusCode(503);
            using var reader=new StreamReader(request.Body);
            var payload=await reader.ReadToEndAsync(ct);
            Event evt;
            try { evt=EventUtility.ConstructEvent(payload,request.Headers["Stripe-Signature"],secret); }
            catch (StripeException) { return Results.BadRequest(); }
            if (evt.Type!="checkout.session.completed" || evt.Data.Object is not Session session || session.PaymentStatus!="paid")
                return Results.Ok();
            if (!Guid.TryParse(session.Metadata?.GetValueOrDefault("order_id"),out var id)) return Results.Ok();
            var order=await db.ServiceOrders.SingleOrDefaultAsync(x=>x.Id==id,ct);
            if (order is null || order.PriceCents!=session.AmountTotal || order.PaymentEnvironment!=PaymentEnvironment.StripeTest) return Results.Ok();
            if (await db.PaymentTransactions.AnyAsync(x=>x.Provider=="stripe" && x.ProviderEventId==evt.Id,ct)) return Results.Ok();
            db.PaymentTransactions.Add(new PaymentTransaction { ServiceOrderId=id,Provider="stripe",ProviderEventId=evt.Id,ProviderPaymentId=session.PaymentIntentId??session.Id,Environment=PaymentEnvironment.StripeTest,AmountCents=order.PriceCents });
            if (order.PaymentStatus==PaymentState.Pending) { order.PaymentStatus=PaymentState.Paid; OrderWorkflow.Transition(order,OrderStatus.Paid,"stripe-webhook"); }
            try { await db.SaveChangesAsync(ct); } catch (DbUpdateException) { return Results.StatusCode(500); }
            return Results.Ok();
        });
        return app;
    }
}
