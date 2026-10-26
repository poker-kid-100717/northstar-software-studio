using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Northstar.Api.Data;
using Northstar.Api.Domain;
namespace Northstar.Api.Endpoints;
public static class StripeTestEndpoints
{
    public sealed record CheckoutRequest(string ProductSlug,string CustomerName,string CustomerEmail,string ProblemDescription,string ReproductionSteps);
    public static IEndpointRouteBuilder MapStripeTest(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/checkout/test", async (CheckoutRequest r,NorthstarDbContext db,IConfiguration cfg,IHttpClientFactory factory,CancellationToken ct) =>
        {
            if (!cfg.GetValue<bool>("Payments:TestEnabled")) return Results.Problem("Test checkout disabled",statusCode:503);
            var key=cfg["Stripe:SecretKey"];
            var origin=cfg["Payments:PublicOrigin"]?.TrimEnd('/');
            if (key is null || !key.StartsWith("sk_test_",StringComparison.Ordinal) || !Uri.TryCreate(origin,UriKind.Absolute,out var uri) || (uri.Scheme!="https" && uri.Host!="localhost")) return Results.Problem("Invalid test configuration",statusCode:503);
            if (r.CustomerName is null || r.CustomerName.Length is < 2 or > 100 || !new EmailAddressAttribute().IsValid(r.CustomerEmail) ||
                r.ProblemDescription is null || r.ProblemDescription.Length is < 20 or > 8000 || r.ReproductionSteps is null || r.ReproductionSteps.Length is < 10 or > 4000)
                return Results.BadRequest(new {error="Invalid customer intake."});
            await using var tx=await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.ReadCommitted,ct);
            // Transaction-scoped advisory lock serializes capacity decisions across API instances.
            await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(8103421)",ct);
            var product=await db.ServiceProducts.SingleOrDefaultAsync(p=>p.Slug==r.ProductSlug && p.IsActive && p.PaymentEligible,ct);
            if(product is null) return Results.BadRequest(new {error="Service unavailable."});
            var now=DateTimeOffset.UtcNow;
            // Expired reservations no longer count toward capacity; a later paid webhook still requires reconciliation.
            var pending=await db.ServiceOrders.Where(o=>o.Status==OrderStatus.PendingPayment && o.ReservationExpiresAt<=now).ToListAsync(ct);
            foreach(var old in pending) OrderWorkflow.Transition(old,OrderStatus.Cancelled,"reservation-expiry");
            await db.SaveChangesAsync(ct);
            var limits=cfg.GetSection("Capacity").Get<CapacityOptions>()??new();
            var capacity=await CapacityPolicy.CheckAsync(db,product,limits,now,ct);
            if(!capacity.Available) return Results.Conflict(new {error=capacity.Reason});
            var order=new ServiceOrder{ServiceProductId=product.Id,CustomerName=r.CustomerName.Trim(),CustomerEmail=r.CustomerEmail.Trim(),ProblemDescription=r.ProblemDescription.Trim(),ReproductionSteps=r.ReproductionSteps.Trim(),PriceCents=product.PriceCents,PaymentEnvironment=PaymentEnvironment.StripeTest,ReservationExpiresAt=now.AddMinutes(30)};
            db.ServiceOrders.Add(order);
            await db.SaveChangesAsync(ct);
            using var client=factory.CreateClient();
            client.DefaultRequestHeaders.Authorization=new AuthenticationHeaderValue("Bearer",key);
            var fields=new Dictionary<string,string>{
                ["mode"]="payment",["customer_email"]=order.CustomerEmail,
                ["success_url"]=$"{origin}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}",
                ["cancel_url"]=$"{origin}/checkout/cancel",
                ["client_reference_id"]=order.Id.ToString(),
                ["metadata[order_id]"]=order.Id.ToString(),
                ["line_items[0][price_data][currency]"]="usd",
                ["line_items[0][price_data][unit_amount]"]=order.PriceCents.ToString(CultureInfo.InvariantCulture),
                ["line_items[0][price_data][product_data][name]"]=product.Name,
                ["line_items[0][quantity]"]="1",
                ["expires_at"]=order.ReservationExpiresAt.Value.ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture)
            };
            using var response=await client.PostAsync("https://api.stripe.com/v1/checkout/sessions",new FormUrlEncodedContent(fields),ct);
            if(!response.IsSuccessStatusCode) return Results.Problem("Payment provider could not create a test session.",statusCode:502);
            using var json=JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
            var session=json.RootElement.GetProperty("id").GetString();
            var url=json.RootElement.GetProperty("url").GetString();
            if(string.IsNullOrWhiteSpace(session)||string.IsNullOrWhiteSpace(url)) return Results.Problem("Invalid checkout response",statusCode:502);
            order.StripeCheckoutSessionId=session;
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return Results.Ok(new {orderId=order.Id,checkoutUrl=url,environment="test"});
        }).RequireRateLimiting("intake");
        app.MapPost("/api/stripe/webhook",async (HttpRequest request,NorthstarDbContext db,IConfiguration cfg,CancellationToken ct)=>
        {
            if(!cfg.GetValue<bool>("Payments:TestEnabled")) return Results.StatusCode(503);
            var secret=cfg["Stripe:WebhookSecret"];
            if(string.IsNullOrWhiteSpace(secret)||!secret.StartsWith("whsec_",StringComparison.Ordinal)) return Results.StatusCode(503);
            using var reader=new StreamReader(request.Body);
            var body=await reader.ReadToEndAsync(ct);
            if(!Verify(body,request.Headers["Stripe-Signature"].ToString(),secret)) return Results.BadRequest();
            using var json=JsonDocument.Parse(body);
            var root=json.RootElement;
            var eventId=root.GetProperty("id").GetString()??"";
            var type=root.GetProperty("type").GetString();
            if(type!="checkout.session.completed" && type!="checkout.session.async_payment_succeeded") return Results.Ok();
            var session=root.GetProperty("data").GetProperty("object");
            if(session.GetProperty("payment_status").GetString()!="paid") return Results.Ok();
            if(!Guid.TryParse(session.GetProperty("client_reference_id").GetString(),out var id)) return Results.Ok();
            var sessionId=session.GetProperty("id").GetString();
            var amount=session.GetProperty("amount_total").GetInt32();
            if(session.GetProperty("currency").GetString()!="usd") return Results.BadRequest();
            if(session.GetProperty("livemode").GetBoolean()) return Results.BadRequest();
            await using var tx=await db.Database.BeginTransactionAsync(ct);
            await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(8103421)",ct);
            if(await db.PaymentTransactions.AnyAsync(t=>t.Provider=="stripe" && t.ProviderEventId==eventId,ct)) return Results.Ok();
            var order=await db.ServiceOrders.SingleOrDefaultAsync(o=>o.Id==id,ct);
            if(order is null || order.StripeCheckoutSessionId!=sessionId || order.PriceCents!=amount || order.PaymentEnvironment!=PaymentEnvironment.StripeTest) return Results.BadRequest();
            db.PaymentTransactions.Add(new PaymentTransaction{ServiceOrderId=id,Provider="stripe",ProviderEventId=eventId,ProviderPaymentId=sessionId??"",Environment=PaymentEnvironment.StripeTest,AmountCents=amount});
            if(order.PaymentStatus==PaymentState.Pending)
            {
                order.PaymentStatus=PaymentState.Paid;
                if(order.Status==OrderStatus.PendingPayment) OrderWorkflow.Transition(order,OrderStatus.Paid,"stripe-test-webhook");
                // Expired reservations can receive delayed payments. Flag for manual refund/reconciliation, never silently discard payment.
                else if(order.Status==OrderStatus.Cancelled) order.RequiresPaymentReview=true;
            }
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return Results.Ok();
        });
        return app;
    }
    private static bool Verify(string body,string header,string secret)
    {
        var parts=header.Split(',',StringSplitOptions.TrimEntries);
        var timestamp=parts.FirstOrDefault(p=>p.StartsWith("t=",StringComparison.Ordinal))?[2..];
        var signatures=parts.Where(p=>p.StartsWith("v1=",StringComparison.Ordinal)).Select(p=>p[3..]).ToArray();
        if(!long.TryParse(timestamp,out var seconds)||Math.Abs(DateTimeOffset.UtcNow.ToUnixTimeSeconds()-seconds)>300) return false;
        var hash=HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret),Encoding.UTF8.GetBytes(timestamp+"."+body));
        return signatures.Any(s=>TryCompare(s,hash));
    }
    private static bool TryCompare(string hex,byte[] expected)
    {
        try { var actual=Convert.FromHexString(hex); return CryptographicOperations.FixedTimeEquals(actual,expected); }
        catch(FormatException){return false;}
    }
}
