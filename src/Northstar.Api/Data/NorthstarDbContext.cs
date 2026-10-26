using Microsoft.EntityFrameworkCore;
using Northstar.Api.Domain;
namespace Northstar.Api.Data;
public sealed class NorthstarDbContext(DbContextOptions<NorthstarDbContext> options) : DbContext(options)
{
    public DbSet<ServiceProduct> ServiceProducts => Set<ServiceProduct>();
    public DbSet<ServiceOrder> ServiceOrders => Set<ServiceOrder>();
    public DbSet<OrderAttachment> OrderAttachments => Set<OrderAttachment>();
    public DbSet<OrderDeliverable> OrderDeliverables => Set<OrderDeliverable>();
    public DbSet<OrderRevision> OrderRevisions => Set<OrderRevision>();
    public DbSet<OrderStatusHistory> OrderStatusHistory => Set<OrderStatusHistory>();
    public DbSet<PaymentTransaction> PaymentTransactions => Set<PaymentTransaction>();
    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<ServiceProduct>().HasIndex(x => x.Slug).IsUnique();
        b.Entity<ServiceProduct>().HasIndex(x => new { x.IsActive, x.DisplayOrder });
        b.Entity<ServiceOrder>().HasIndex(x => new { x.Status, x.CreatedAt });
        b.Entity<ServiceOrder>().HasIndex(x => x.CustomerEmail);
        b.Entity<PaymentTransaction>().HasIndex(x => new { x.Provider, x.ProviderEventId }).IsUnique();
        b.Entity<OrderStatusHistory>().HasIndex(x => new { x.ServiceOrderId, x.CreatedAt });
        b.Entity<ServiceProduct>().Property(x => x.EstimatedHours).HasPrecision(7, 2);
        b.Entity<ServiceOrder>().Property(x => x.ActualHours).HasPrecision(9, 2);
        b.Entity<ServiceOrder>().Property(x => x.Status).HasConversion<string>();
        b.Entity<ServiceOrder>().Property(x => x.PaymentStatus).HasConversion<string>();
        b.Entity<ServiceOrder>().Property(x => x.PaymentEnvironment).HasConversion<string>();
        b.Entity<PaymentTransaction>().Property(x => x.Environment).HasConversion<string>();
        b.Entity<OrderStatusHistory>().Property(x => x.FromStatus).HasConversion<string>();
        b.Entity<OrderStatusHistory>().Property(x => x.ToStatus).HasConversion<string>();
    }
}
