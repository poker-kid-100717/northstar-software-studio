using Microsoft.EntityFrameworkCore;
using Northstar.Api.Data;
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<NorthstarDbContext>(o => o.UseNpgsql(
    builder.Configuration.GetConnectionString("Northstar") ?? throw new InvalidOperationException("ConnectionStrings:Northstar is required")));
var app = builder.Build();
app.MapGet("/health", () => Results.Ok(new { status = "ok", service = "Northstar Software Studio" }));
app.MapGet("/api/instant-fixes", async (NorthstarDbContext db, CancellationToken ct) =>
    await db.ServiceProducts.AsNoTracking().Where(p => p.IsActive)
        .OrderBy(p => p.DisplayOrder)
        .Select(p => new { p.Id, p.Slug, p.Name, p.Category, p.Description, p.PriceCents, p.Scope, p.Exclusions, p.TurnaroundBusinessDays, p.PaymentEligible })
        .ToListAsync(ct));
app.MapGet("/api/instant-fixes/{slug}", async (string slug, NorthstarDbContext db, CancellationToken ct) =>
{
    var p = await db.ServiceProducts.AsNoTracking().SingleOrDefaultAsync(x => x.Slug == slug && x.IsActive, ct);
    return p is null ? Results.NotFound() : Results.Ok(new { p.Id, p.Slug, p.Name, p.Category, p.Description, p.PriceCents, p.Scope, p.Exclusions, p.EstimatedHours, p.RequiredInputs, p.Deliverables, p.RevisionAllowance, p.TurnaroundBusinessDays, p.PaymentEligible });
});
// Apply migrations through deployment tooling; never mutate schema implicitly during public requests.
app.Run();
public partial class Program { }
