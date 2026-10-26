using Microsoft.EntityFrameworkCore;
using Northstar.Api.Domain;
namespace Northstar.Api.Data;
public static class ProductSeed
{
    private static readonly (int Price, string Category, string Name)[] Catalog =
    [
        (30,"Quick Fixes","SQL Query Syntax Fix"),
        (30,"Quick Fixes","JSON / CSV Formatting Repair"),
        (30,"Quick Fixes","Regex or Validation Fix"),
        (30,"Quick Fixes","C# Compilation Error Fix"),
        (30,"Quick Fixes","API Request Formatting Fix"),
        (50,"Targeted Fixes","SQL Query Correction"),
        (50,"Targeted Fixes","C# Method Bug Fix"),
        (50,"Targeted Fixes","Excel / CSV Import Mapping"),
        (50,"Targeted Fixes","API 400/401 Troubleshooting"),
        (50,"Targeted Fixes","HTML / CSS Layout Fix"),
        (100,"Advanced Fixes","SQL Performance Quick Tune"),
        (100,"Advanced Fixes","API Endpoint Bug Repair"),
        (100,"Advanced Fixes","Small Automation Repair"),
        (100,"Advanced Fixes","Webhook Delivery Troubleshooting"),
        (100,"Advanced Fixes","CI/CD Pipeline Repair")
    ];
    public static async Task SeedAsync(NorthstarDbContext db, CancellationToken ct = default)
    {
        var existing = await db.ServiceProducts.Select(p => p.Slug).ToListAsync(ct);
        var existingSet = existing.ToHashSet(StringComparer.OrdinalIgnoreCase);
        for (var i = 0; i < Catalog.Length; i++)
        {
            var (price, category, name) = Catalog[i];
            var slug = Slugify(name);
            if (existingSet.Contains(slug)) continue;
            db.ServiceProducts.Add(new ServiceProduct
            {
                Slug = slug, Name = name, Category = category, PriceCents = price * 100,
                Description = $"A narrowly scoped review and correction for one {name.ToLowerInvariant()} issue.",
                Scope = "One reproducible issue and one clearly defined deliverable.",
                Exclusions = "No ongoing support, unrelated issues, production access, or guaranteed resolution outside agreed scope.",
                EstimatedHours = price == 30 ? 0.5m : price == 50 ? 0.75m : 1.5m,
                RequiredInputs = "Redacted error message, reproduction steps, expected and actual behavior; no secrets.",
                Deliverables = "Written findings and one targeted correction or recommended next step.",
                RevisionAllowance = 1, MaximumAcceptedWorkload = 3,
                TurnaroundBusinessDays = price == 100 ? 5 : 3,
                PaymentEligible = false, // owner must explicitly enable after payment integration and capacity review
                DisplayOrder = i + 1
            });
        }
        await db.SaveChangesAsync(ct);
    }
    private static string Slugify(string value) => string.Join("-", value.ToLowerInvariant()
        .Replace("#", "sharp").Replace("/", " ").Split(' ', StringSplitOptions.RemoveEmptyEntries))
        .Replace("--", "-");
}
