namespace Northstar.Api.Domain;
public static class OrderWorkflow
{
    private static readonly IReadOnlyDictionary<OrderStatus, OrderStatus[]> Allowed = new Dictionary<OrderStatus, OrderStatus[]>
    {
        [OrderStatus.PendingPayment] = [OrderStatus.Paid, OrderStatus.Cancelled],
        [OrderStatus.Paid] = [OrderStatus.AwaitingReview, OrderStatus.RefundPending],
        [OrderStatus.AwaitingReview] = [OrderStatus.Accepted, OrderStatus.NeedsClarification, OrderStatus.Declined],
        [OrderStatus.Accepted] = [OrderStatus.InProgress, OrderStatus.RefundPending],
        [OrderStatus.NeedsClarification] = [OrderStatus.AwaitingReview, OrderStatus.Declined],
        [OrderStatus.InProgress] = [OrderStatus.Delivered, OrderStatus.NeedsClarification, OrderStatus.RefundPending],
        [OrderStatus.Delivered] = [OrderStatus.Completed, OrderStatus.InProgress],
        [OrderStatus.Completed] = [],
        [OrderStatus.Declined] = [OrderStatus.RefundPending],
        [OrderStatus.RefundPending] = [OrderStatus.Refunded],
        [OrderStatus.Refunded] = [],
        [OrderStatus.Cancelled] = []
    };
    public static bool CanTransition(OrderStatus from, OrderStatus to) => Allowed.TryGetValue(from, out var next) && next.Contains(to);
    public static void Transition(ServiceOrder order, OrderStatus to, string actor)
    {
        if (!CanTransition(order.Status, to)) throw new InvalidOperationException($"Invalid transition: {order.Status} -> {to}");
        order.StatusHistory.Add(new OrderStatusHistory { ServiceOrderId = order.Id, FromStatus = order.Status, ToStatus = to, Actor = actor });
        order.Status = to;
        order.UpdatedAt = DateTimeOffset.UtcNow;
    }
}
