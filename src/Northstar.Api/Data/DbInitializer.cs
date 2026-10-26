using Microsoft.EntityFrameworkCore;
namespace Northstar.Api.Data;
public static class DbInitializer
{
    public static async Task InitializeAsync(IServiceProvider services, CancellationToken ct = default)
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<NorthstarDbContext>();
        if ((await db.Database.GetPendingMigrationsAsync(ct)).Any())
            throw new InvalidOperationException("Apply pending EF Core migrations before starting the API.");
        await ProductSeed.SeedAsync(db, ct);
    }
}
