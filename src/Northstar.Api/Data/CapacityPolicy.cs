using Microsoft.EntityFrameworkCore;
using Northstar.Api.Domain;
namespace Northstar.Api.Data;
public sealed class CapacityOptions
{
    public int MaximumOpenOrders { get; set; } = 5;
    public int MaximumOrdersPerDay { get; set; } = 3;
    public decimal MaximumEstimatedHoursPerWeek { get; set; } = 12;
}
public static class CapacityPolicy
{
    private static readonly OrderStatus[] OpenStatuses = [OrderStatus.Paid, OrderStatus.AwaitingReview, OrderStatus.Accepted, OrderStatus.NeedsClarification, OrderStatus.InProgress, OrderStatus.Delivered];
    public static async Task<(bool Available, string? Reason)> CheckAsync(NorthstarDbContext db, ServiceProduct product, CapacityOptions limits, DateTimeOffset now, CancellationToken ct = default)
    {
        if (!product.IsActive || !product.PaymentEligible) return (false, "This service is not currently accepting purchases.");
        var open = await db.ServiceOrders.AsNoTracking().CountAsync(o => OpenStatuses.Contains(o.Status), ct);
        if (open >= limits.MaximumOpenOrders) return (false, "The studio is currently at capacity.");
        var dayStart = new DateTimeOffset(now.UtcDateTime.Date, TimeSpan.Zero);
        var daily = await db.ServiceOrders.AsNoTracking().CountAsync(o => o.CreatedAt >= dayStart && o.CreatedAt < dayStart.AddDays(1) && o.Status != OrderStatus.Cancelled, ct);
        if (daily >= limits.MaximumOrdersPerDay) return (false, "Today's order capacity has been reached.");
        var weekStart = dayStart.AddDays(-(((int)dayStart.DayOfWeek + 6) % 7));
        var weekly = await db.ServiceOrders.AsNoTracking()
            .Where(o => o.CreatedAt >= weekStart && o.CreatedAt < weekStart.AddDays(7) && o.Status != OrderStatus.Cancelled && o.Status != OrderStatus.Refunded)
            .Join(db.ServiceProducts, o => o.ServiceProductId, p => p.Id, (o,p) => new { p.EstimatedHours })
            .SumAsync(x => (decimal?)x.EstimatedHours, ct) ?? 0;
        if (weekly + product.EstimatedHours > limits.MaximumEstimatedHoursPerWeek) return (false, "Weekly fulfillment capacity has been reached.");
        var productOpen = await db.ServiceOrders.AsNoTracking().CountAsync(o => o.ServiceProductId == product.Id && OpenStatuses.Contains(o.Status), ct);
        if (productOpen >= product.MaximumAcceptedWorkload) return (false, "This service is temporarily unavailable.");
        return (true, null);
    }
}
