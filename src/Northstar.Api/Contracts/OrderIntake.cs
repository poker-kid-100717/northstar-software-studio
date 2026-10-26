using System.ComponentModel.DataAnnotations;
namespace Northstar.Api.Contracts;
public sealed class OrderIntake
{
    [Required, StringLength(100, MinimumLength = 2)] public string CustomerName { get; set; } = "";
    [Required, EmailAddress, StringLength(254)] public string CustomerEmail { get; set; } = "";
    [Required, StringLength(8000, MinimumLength = 20)] public string ProblemDescription { get; set; } = "";
    [Required, StringLength(4000, MinimumLength = 10)] public string ReproductionSteps { get; set; } = "";
    [Required] public string ProductSlug { get; set; } = "";
}
