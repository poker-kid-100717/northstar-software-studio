namespace Northstar.Api.Domain;
public sealed class ServiceProduct
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Slug { get; set; }
    public required string Name { get; set; }
    public required string Description { get; set; }
    public required string Category { get; set; }
    public int PriceCents { get; set; }
    public required string Scope { get; set; }
    public required string Exclusions { get; set; }
    public decimal EstimatedHours { get; set; }
    public required string RequiredInputs { get; set; }
    public required string Deliverables { get; set; }
    public int RevisionAllowance { get; set; } = 1;
    public bool IsActive { get; set; } = true;
    public int MaximumAcceptedWorkload { get; set; } = 3;
    public int TurnaroundBusinessDays { get; set; } = 3;
    public bool PaymentEligible { get; set; } = false;
    public int DisplayOrder { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
