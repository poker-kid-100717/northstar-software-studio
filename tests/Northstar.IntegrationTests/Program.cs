using Microsoft.EntityFrameworkCore;
using Northstar.Api.Data;
using Northstar.Api.Domain;
var connection = Environment.GetEnvironmentVariable("ConnectionStrings__Northstar")
    ?? throw new InvalidOperationException("Set ConnectionStrings__Northstar to an isolated test database.");
if (!connection.Contains("northstar_test", StringComparison.OrdinalIgnoreCase))
    throw new InvalidOperationException("Refusing to test against a database not named northstar_test.");
var options = new DbContextOptionsBuilder<NorthstarDbContext>().UseNpgsql(connection).Options;
await using (var db = new NorthstarDbContext(options))
{
    await db.Database.EnsureDeletedAsync();
    await db.Database.EnsureCreatedAsync();
    await ProductSeed.SeedAsync(db);
    Assert(await db.ServiceProducts.CountAsync() == 15, "Expected 15 seeded products");
    var product = await db.ServiceProducts.OrderBy(x => x.DisplayOrder).FirstAsync();
    Assert(product.PriceCents == 3000 && !product.PaymentEligible, "Products must default to payment disabled");
    product.PaymentEligible = true;
    var order = new ServiceOrder
    {
        ServiceProductId = product.Id,
        CustomerName = "Test Customer", CustomerEmail = "test@example.invalid",
        ProblemDescription = "A reproducible synthetic problem for database testing.",
        ReproductionSteps = "Run the sample and observe its output.",
        PriceCents = product.PriceCents,
        PaymentEnvironment = PaymentEnvironment.StripeTest,
        ReservationExpiresAt = DateTimeOffset.UtcNow.AddMinutes(30),
        StripeCheckoutSessionId = "cs_test_northstar_integration"
    };
    db.ServiceOrders.Add(order);
    await db.SaveChangesAsync();
    var capacity = await CapacityPolicy.CheckAsync(db, product, new CapacityOptions { MaximumOpenOrders = 1 }, DateTimeOffset.UtcNow);
    Assert(!capacity.Available, "Pending checkout reservation must consume capacity");
    OrderWorkflow.Transition(order, OrderStatus.Paid, "integration-test");
    db.Entry(order.StatusHistory.Single()).State = EntityState.Added;
    order.PaymentStatus = PaymentState.Paid;
    db.PaymentTransactions.Add(new PaymentTransaction
    {
        ServiceOrderId = order.Id, Provider = "stripe", ProviderEventId = "evt_test_unique",
        ProviderPaymentId = "cs_test_northstar_integration", AmountCents = 3000,
        Environment = PaymentEnvironment.StripeTest
    });
    await db.SaveChangesAsync();
}
await using (var db = new NorthstarDbContext(options))
{
    var order = await db.ServiceOrders.Include(x => x.Transactions).Include(x => x.StatusHistory).SingleAsync();
    Assert(order.Status == OrderStatus.Paid && order.PaymentStatus == PaymentState.Paid, "Payment state must persist");
    Assert(order.Transactions.Count == 1 && order.StatusHistory.Count == 1, "Payment audit trail must persist");
    db.PaymentTransactions.Add(new PaymentTransaction
    {
        ServiceOrderId = order.Id, Provider = "stripe", ProviderEventId = "evt_test_unique",
        ProviderPaymentId = "cs_test_northstar_integration", AmountCents = 3000,
        Environment = PaymentEnvironment.StripeTest
    });
    try
    {
        await db.SaveChangesAsync();
        throw new InvalidOperationException("Duplicate webhook event unexpectedly accepted");
    }
    catch (DbUpdateException) { /* Unique index correctly rejects duplicate provider event. */ }
}
Console.WriteLine("PASS: PostgreSQL seed, order persistence, pending capacity, paid state, audit history and webhook event uniqueness.");
static void Assert(bool condition, string message) { if (!condition) throw new InvalidOperationException(message); }
