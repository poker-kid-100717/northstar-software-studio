using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
namespace Northstar.Api.Data;
public sealed class NorthstarDbContextFactory : IDesignTimeDbContextFactory<NorthstarDbContext>
{
    public NorthstarDbContext CreateDbContext(string[] args)
    {
        var connection = Environment.GetEnvironmentVariable("ConnectionStrings__Northstar")
            ?? "Host=localhost;Port=5432;Database=northstar;Username=northstar;Password=local_dev_only";
        var options = new DbContextOptionsBuilder<NorthstarDbContext>().UseNpgsql(connection).Options;
        return new NorthstarDbContext(options);
    }
}
