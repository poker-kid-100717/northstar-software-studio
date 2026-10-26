namespace Northstar.Api.Domain;
public enum OrderStatus { PendingPayment, Paid, AwaitingReview, Accepted, NeedsClarification, InProgress, Delivered, Completed, Declined, RefundPending, Refunded, Cancelled }
public enum PaymentEnvironment { Simulated, StripeTest, StripeLive }
public enum PaymentState { Pending, Paid, RefundPending, Refunded, Failed }
public sealed class ServiceOrder
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ServiceProductId { get; set; }
    public ServiceProduct ServiceProduct { get; set; } = null!;
    public required string CustomerName { get; set; }
    public required string CustomerEmail { get; set; }
    public required string ProblemDescription { get; set; }
    public required string ReproductionSteps { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.PendingPayment;
    public PaymentState PaymentStatus { get; set; } = PaymentState.Pending;
    public PaymentEnvironment PaymentEnvironment { get; set; }
    public int PriceCents { get; set; }
    public int ProcessingFeesCents { get; set; }
    public int RefundedCents { get; set; }
    public decimal ActualHours { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public ICollection<OrderAttachment> Attachments { get; set; } = new List<OrderAttachment>();
    public ICollection<OrderDeliverable> Deliverables { get; set; } = new List<OrderDeliverable>();
    public ICollection<OrderRevision> Revisions { get; set; } = new List<OrderRevision>();
    public ICollection<OrderStatusHistory> StatusHistory { get; set; } = new List<OrderStatusHistory>();
    public ICollection<PaymentTransaction> Transactions { get; set; } = new List<PaymentTransaction>();
    public decimal EffectiveHourlyEarnings => ActualHours > 0 ? (PriceCents - ProcessingFeesCents - RefundedCents) / 100m / ActualHours : 0;
}
public sealed class OrderAttachment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ServiceOrderId { get; set; }
    public ServiceOrder ServiceOrder { get; set; } = null!;
    public required string PrivateStorageKey { get; set; }
    public required string OriginalFilename { get; set; }
    public required string ContentType { get; set; }
    public long SizeBytes { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
public sealed class OrderDeliverable
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ServiceOrderId { get; set; }
    public ServiceOrder ServiceOrder { get; set; } = null!;
    public required string Description { get; set; }
    public string? PrivateStorageKey { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
public sealed class OrderRevision
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ServiceOrderId { get; set; }
    public ServiceOrder ServiceOrder { get; set; } = null!;
    public required string Request { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
public sealed class OrderStatusHistory
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ServiceOrderId { get; set; }
    public ServiceOrder ServiceOrder { get; set; } = null!;
    public OrderStatus FromStatus { get; set; }
    public OrderStatus ToStatus { get; set; }
    public required string Actor { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
public sealed class PaymentTransaction
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ServiceOrderId { get; set; }
    public ServiceOrder ServiceOrder { get; set; } = null!;
    public required string Provider { get; set; }
    public required string ProviderEventId { get; set; }
    public required string ProviderPaymentId { get; set; }
    public PaymentEnvironment Environment { get; set; }
    public int AmountCents { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
