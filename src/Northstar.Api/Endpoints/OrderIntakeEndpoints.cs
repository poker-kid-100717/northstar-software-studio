using System.ComponentModel.DataAnnotations;
using System.Data;
using System.Threading.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Northstar.Api.Contracts;
using Northstar.Api.Data;
using Northstar.Api.Domain;
namespace Northstar.Api.Endpoints;
public static class OrderIntakeEndpoints
{
    public static IEndpointRouteBuilder MapOrderIntake(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/orders/intake", async (OrderIntake request, NorthstarDbContext db, IConfiguration config, CancellationToken ct) =>
        {
            var errors = new List<ValidationResult>();
            if (!Validator.TryValidateObject(request, new ValidationContext(request), errors, true))
                return Results.ValidationProblem(errors.GroupBy(x => x.MemberNames.FirstOrDefault() ?? "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.ErrorMessage ?? "Invalid").ToArray()));
            var product = await db.ServiceProducts.SingleOrDefaultAsync(p => p.Slug == request.ProductSlug && p.IsActive, ct);
            if (product is null) return Results.NotFound(new { error = "Product unavailable." });
            // Intake is an expression of interest, not a purchase or capacity reservation.
            // Orders cannot be created until a verified, atomic checkout reservation exists.
            return Results.Ok(new {
                acceptedForPreview = true,
                product = product.Name,
                quotedPriceCents = product.PriceCents,
                checkoutEnabled = false,
                notice = "Preview only. No order was created and no payment was collected. Please do not submit confidential information."
            });
        }).RequireRateLimiting("intake");
        return app;
    }
}
