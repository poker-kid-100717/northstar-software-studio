using Microsoft.EntityFrameworkCore;
using Northstar.Api.Data;
using Northstar.Api.Endpoints;
using System.Threading.RateLimiting;
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddHttpClient();
builder.Services.AddDbContext<NorthstarDbContext>(o => o.UseNpgsql(
    builder.Configuration.GetConnectionString("Northstar") ?? throw new InvalidOperationException("ConnectionStrings:Northstar is required")));
builder.Services.AddRateLimiter(options => options.AddPolicy("intake", context => RateLimitPartition.GetFixedWindowLimiter(context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions { PermitLimit = 5, Window = TimeSpan.FromMinutes(10), QueueLimit = 0 })));
var app = builder.Build();
app.UseRateLimiter();
if (app.Environment.IsDevelopment())
{
    await using var scope = app.Services.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<NorthstarDbContext>();
    // Apply versioned migrations to a fresh or previously migrated development database.
    // Legacy EnsureCreated databases must be backed up and migrated separately.
    await db.Database.MigrateAsync();
    await ProductSeed.SeedAsync(db);
}
// Explicit opt-in for seeding the catalog on a deployed instance. Never applies migrations.
// Production migrations must be applied by a separate, controlled deployment step.
if (!app.Environment.IsDevelopment() && builder.Configuration.GetValue<bool>("Catalog:SeedOnStartup"))
    await DbInitializer.InitializeAsync(app.Services);
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
app.MapOrderIntake();
app.MapStripeTest();
app.Run();
public partial class Program { }
