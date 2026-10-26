using Microsoft.EntityFrameworkCore;
using Northstar.Api.Domain;
namespace Northstar.Api.Data;
public static class ProductSeed
{
    // This catalog is deliberately kept in sync with the 65 customer-facing discovery cards.
    // The parity check in CI detects changes to either list before they can ship.
    private static readonly (int Price, string Tier, string Name, string ProblemCategory, string Problem, string Outcome, string Scope)[] Catalog =
    [
        (30, @"Quick Fixes", @"SQL Query Syntax Fix", @"Data & spreadsheets", @"My SQL query will not run.", @"A corrected statement and explanation of the error.", @"One supplied query; no database redesign."),
        (30, @"Quick Fixes", @"JSON / CSV Formatting Repair", @"Data & spreadsheets", @"My data file is rejected or malformed.", @"One corrected sample file or payload.", @"One small, redacted file or JSON payload."),
        (30, @"Quick Fixes", @"Regex or Validation Fix", @"Websites & forms", @"A form rejects valid information.", @"One corrected validation rule with examples.", @"One field or regular expression."),
        (30, @"Quick Fixes", @"C# Compilation Error Fix", @"Code & .NET", @"My .NET code will not compile.", @"A targeted correction with a short explanation.", @"One reproducible compiler error in an isolated snippet."),
        (30, @"Quick Fixes", @"API Request Formatting Fix", @"APIs & integrations", @"My API request has the wrong format.", @"A corrected sample request and explanation.", @"One endpoint request; no server-side changes."),
        (50, @"Targeted Fixes", @"SQL Query Correction", @"Data & spreadsheets", @"My SQL query returns the wrong results.", @"One corrected query with a verification example.", @"One query and sample data; no schema changes."),
        (50, @"Targeted Fixes", @"C# Method Bug Fix", @"Code & .NET", @"One method is producing the wrong result.", @"A targeted code correction and suggested test.", @"One isolated method with reproduction steps."),
        (50, @"Targeted Fixes", @"Excel / CSV Import Mapping", @"Data & spreadsheets", @"Imported columns are ending up in the wrong fields.", @"One corrected mapping or transformation.", @"One import mapping using redacted sample rows."),
        (50, @"Targeted Fixes", @"API 400/401 Troubleshooting", @"APIs & integrations", @"My API returns a 400 or 401 error.", @"A request-level diagnosis and safe corrective guidance.", @"One request path; no credential sharing or provider changes."),
        (50, @"Targeted Fixes", @"HTML / CSS Layout Fix", @"Websites & forms", @"One part of my website looks broken.", @"A focused markup or CSS correction.", @"One component or responsive layout issue."),
        (100, @"Advanced Fixes", @"SQL Performance Quick Tune", @"Data & spreadsheets", @"A specific SQL query is unusually slow.", @"A reviewed query and targeted tuning recommendations.", @"One query and available execution-plan evidence; no guaranteed speedup."),
        (100, @"Advanced Fixes", @"API Endpoint Bug Repair", @"APIs & integrations", @"One API endpoint behaves incorrectly.", @"A targeted patch or documented root cause.", @"One reproducible endpoint; no multi-service redesign."),
        (100, @"Advanced Fixes", @"Small Automation Repair", @"Automation & deployment", @"One scheduled script or workflow stopped working.", @"A focused correction or clear next-step diagnosis.", @"One script or automation path."),
        (100, @"Advanced Fixes", @"Webhook Delivery Troubleshooting", @"APIs & integrations", @"A webhook is not arriving or processing.", @"A delivery-path diagnosis and targeted fix where feasible.", @"One webhook event and destination; no platform-wide rebuild."),
        (100, @"Advanced Fixes", @"CI/CD Pipeline Repair", @"Automation & deployment", @"My GitHub Actions build or deployment fails.", @"A targeted workflow correction or root-cause report.", @"One reproducible pipeline failure; no infrastructure migration."),
        (30, @"Quick Fixes", @"Broken Link or Button Fix", @"Websites & forms", @"A link or button does nothing.", @"One corrected link or click handler.", @"One link or button."),
        (30, @"Quick Fixes", @"Form Field Validation Fix", @"Websites & forms", @"A form rejects a valid value.", @"One corrected validation rule.", @"One form field."),
        (30, @"Quick Fixes", @"Website Text or Image Fix", @"Websites & forms", @"A page shows the wrong text or image.", @"One corrected content element.", @"One page element; assets supplied."),
        (50, @"Targeted Fixes", @"Mobile Menu Layout Fix", @"Websites & forms", @"The navigation breaks on phones.", @"One responsive navigation correction.", @"One menu component."),
        (50, @"Targeted Fixes", @"Contact Form Submission Fix", @"Websites & forms", @"My contact form will not submit.", @"A targeted client-side form correction.", @"One form; email delivery issues quoted separately."),
        (50, @"Targeted Fixes", @"Responsive Overflow Fix", @"Websites & forms", @"My page scrolls sideways on mobile.", @"One responsive CSS correction.", @"One page section."),
        (50, @"Targeted Fixes", @"Browser Console Error Fix", @"Websites & forms", @"A website shows an error in the console.", @"Diagnosis and correction of one reproducible error.", @"One client-side error."),
        (100, @"Advanced Fixes", @"Website Accessibility Quick Fix", @"Websites & forms", @"One page is difficult to use with a keyboard.", @"Correction of one defined accessibility issue.", @"One component; not a full compliance audit."),
        (100, @"Advanced Fixes", @"Form Email Delivery Diagnosis", @"Websites & forms", @"Form submissions do not reach my inbox.", @"Diagnosis of one form-to-email delivery path.", @"One form and sender configuration; no DNS overhaul."),
        (100, @"Advanced Fixes", @"Website Performance Quick Review", @"Websites & forms", @"One page loads unusually slowly.", @"A focused performance diagnosis and recommendations.", @"One page and supplied performance evidence."),
        (30, @"Quick Fixes", @"API Header Fix", @"APIs & integrations", @"An API request is missing required headers.", @"One corrected example request.", @"One endpoint request; no secret sharing."),
        (30, @"Quick Fixes", @"JSON Payload Shape Fix", @"APIs & integrations", @"An API rejects my JSON body.", @"One corrected request payload.", @"One request body."),
        (30, @"Quick Fixes", @"HTTP Status Code Explanation", @"APIs & integrations", @"I do not understand an API error.", @"An explanation and reproducible next step.", @"One error response and request example."),
        (50, @"Targeted Fixes", @"API Pagination Fix", @"APIs & integrations", @"My integration misses later pages.", @"One corrected pagination routine.", @"One endpoint and pagination flow."),
        (50, @"Targeted Fixes", @"API Date Format Fix", @"APIs & integrations", @"Dates are rejected by an integration.", @"One corrected date serialization or parsing rule.", @"One field and endpoint."),
        (50, @"Targeted Fixes", @"CORS Configuration Diagnosis", @"APIs & integrations", @"My browser cannot call an API.", @"Diagnosis and a narrowly scoped configuration recommendation.", @"One browser origin and endpoint."),
        (50, @"Targeted Fixes", @"API Response Mapping Fix", @"APIs & integrations", @"My app reads the wrong API fields.", @"One corrected response mapping.", @"One response schema."),
        (100, @"Advanced Fixes", @"OAuth Token Refresh Diagnosis", @"APIs & integrations", @"An integration stops when tokens expire.", @"A targeted token lifecycle diagnosis or patch.", @"One integration flow; no credential sharing."),
        (100, @"Advanced Fixes", @"Webhook Signature Validation Fix", @"APIs & integrations", @"A webhook signature check fails.", @"One corrected signature validation implementation.", @"One webhook provider and event."),
        (100, @"Advanced Fixes", @"API Retry Logic Fix", @"APIs & integrations", @"Temporary API failures break my process.", @"A focused retry/backoff correction.", @"One request path; no distributed redesign."),
        (30, @"Quick Fixes", @"Spreadsheet Formula Fix", @"Data & spreadsheets", @"One formula returns the wrong result.", @"One corrected formula with an explanation.", @"One formula and redacted sample cells."),
        (30, @"Quick Fixes", @"CSV Delimiter Repair", @"Data & spreadsheets", @"A CSV opens with columns merged together.", @"One corrected delimiter or quoting example.", @"One small CSV sample."),
        (30, @"Quick Fixes", @"Date Format Conversion", @"Data & spreadsheets", @"Dates import in the wrong format.", @"One conversion rule and corrected sample.", @"One date field."),
        (50, @"Targeted Fixes", @"Duplicate Row Detection", @"Data & spreadsheets", @"My spreadsheet contains repeated records.", @"One repeatable duplicate-detection formula or query.", @"One sheet or query and key definition."),
        (50, @"Targeted Fixes", @"Spreadsheet Lookup Fix", @"Data & spreadsheets", @"A lookup returns missing or incorrect values.", @"One corrected lookup formula.", @"One lookup and supplied sample data."),
        (50, @"Targeted Fixes", @"CSV Encoding Repair", @"Data & spreadsheets", @"Special characters break during import.", @"One encoding correction and sample output.", @"One input file format."),
        (50, @"Targeted Fixes", @"SQL Join Result Fix", @"Data & spreadsheets", @"My join duplicates or drops records.", @"One corrected join with a verification example.", @"One query and sample tables."),
        (100, @"Advanced Fixes", @"Data Cleanup Script Fix", @"Data & spreadsheets", @"A data cleanup script fails on some rows.", @"A targeted correction with test cases.", @"One existing script and redacted samples."),
        (100, @"Advanced Fixes", @"Import Error Diagnosis", @"Data & spreadsheets", @"A data import fails partway through.", @"A root-cause report and targeted correction if feasible.", @"One import step and error log."),
        (100, @"Advanced Fixes", @"SQL Index Recommendation", @"Data & spreadsheets", @"A known query needs index guidance.", @"One evidence-based index recommendation or explanation.", @"One query and available execution plan; no guaranteed speedup."),
        (30, @"Quick Fixes", @"Null Reference Error Fix", @"Code & .NET", @"My C# code crashes on a null value.", @"One null-safety correction.", @"One isolated exception path."),
        (30, @"Quick Fixes", @"Type Conversion Fix", @"Code & .NET", @"My code cannot convert one data type.", @"One corrected conversion with an example.", @"One conversion expression."),
        (30, @"Quick Fixes", @"LINQ Syntax Fix", @"Code & .NET", @"A LINQ expression will not compile.", @"One corrected LINQ expression.", @"One query expression."),
        (50, @"Targeted Fixes", @"LINQ Wrong Results Fix", @"Code & .NET", @"A LINQ query returns unexpected data.", @"One corrected query and test example.", @"One query and sample inputs."),
        (50, @"Targeted Fixes", @"Dependency Injection Registration Fix", @"Code & .NET", @"A .NET service cannot be resolved.", @"One targeted DI registration correction.", @"One missing registration path."),
        (50, @"Targeted Fixes", @"Async Await Bug Fix", @"Code & .NET", @"An asynchronous method behaves incorrectly.", @"One corrected async method or call site.", @"One reproducible method path."),
        (50, @"Targeted Fixes", @"Unit Test Failure Fix", @"Code & .NET", @"One unit test fails unexpectedly.", @"A focused test or implementation correction.", @"One reproducible test."),
        (100, @"Advanced Fixes", @"EF Core Tracking Bug Fix", @"Code & .NET", @"EF Core updates or reads unexpected entities.", @"One targeted EF Core query or tracking correction.", @"One entity operation."),
        (100, @"Advanced Fixes", @"ASP.NET Middleware Error Fix", @"Code & .NET", @"One request fails inside middleware.", @"A targeted middleware diagnosis and correction.", @"One middleware path."),
        (100, @"Advanced Fixes", @"Small .NET Refactor", @"Code & .NET", @"One method is difficult to maintain.", @"A focused refactor preserving existing behavior.", @"One method with existing tests or examples."),
        (30, @"Quick Fixes", @"GitHub Actions YAML Syntax Fix", @"Automation & deployment", @"My workflow file has a syntax error.", @"One corrected YAML expression or key.", @"One workflow syntax issue."),
        (30, @"Quick Fixes", @"Cron Schedule Fix", @"Automation & deployment", @"My scheduled task runs at the wrong time.", @"One corrected cron schedule with timezone explanation.", @"One schedule definition."),
        (30, @"Quick Fixes", @"Environment Variable Name Fix", @"Automation & deployment", @"My script cannot read a configured variable.", @"One corrected variable reference.", @"One variable; never share its secret value."),
        (50, @"Targeted Fixes", @"GitHub Actions Path Filter Fix", @"Automation & deployment", @"My workflow runs on the wrong files.", @"One corrected trigger or path filter.", @"One workflow trigger."),
        (50, @"Targeted Fixes", @"Build Command Fix", @"Automation & deployment", @"My deployment uses the wrong build command.", @"One corrected command and configuration guidance.", @"One build step."),
        (50, @"Targeted Fixes", @"Scheduled Job Trigger Fix", @"Automation & deployment", @"My scheduled automation never starts.", @"A targeted trigger configuration correction.", @"One scheduled job."),
        (50, @"Targeted Fixes", @"Deployment Environment Mapping Fix", @"Automation & deployment", @"My app reads the wrong deployment setting.", @"One corrected nonsecret environment mapping.", @"One environment and variable mapping."),
        (100, @"Advanced Fixes", @"Docker Compose Startup Fix", @"Automation & deployment", @"My containers fail to start together.", @"One focused Compose configuration correction.", @"One reproducible startup failure."),
        (100, @"Advanced Fixes", @"Cloudflare Pages Routing Fix", @"Automation & deployment", @"My deployed site returns a 404 on refresh.", @"A targeted SPA routing configuration correction.", @"One Pages project and route pattern."),
        (100, @"Advanced Fixes", @"GitHub Actions Artifact Fix", @"Automation & deployment", @"My pipeline does not publish its build output.", @"One corrected artifact upload/download step.", @"One workflow artifact path.")
    ];

    public static async Task SeedAsync(NorthstarDbContext db, CancellationToken ct = default)
    {
        var existing = await db.ServiceProducts.Select(p => p.Slug).ToListAsync(ct);
        var existingSet = existing.ToHashSet(StringComparer.OrdinalIgnoreCase);
        for (var i = 0; i < Catalog.Length; i++)
        {
            var (price, tier, name, problemCategory, problem, outcome, scope) = Catalog[i];
            var slug = Slugify(name);
            if (existingSet.Contains(slug)) continue; // Preserve owner-managed existing product data.
            db.ServiceProducts.Add(new ServiceProduct
            {
                Slug = slug, Name = name, Category = problemCategory, PriceCents = price * 100,
                Description = problem, Scope = scope,
                Exclusions = "No unrelated issues, ongoing support, credential sharing or work outside the agreed scope.",
                EstimatedHours = price == 30 ? 0.5m : price == 50 ? 0.75m : 1.5m,
                RequiredInputs = "Redacted error details, steps to reproduce, expected and actual behavior; never send secrets.",
                Deliverables = outcome,
                RevisionAllowance = 1, MaximumAcceptedWorkload = 3,
                TurnaroundBusinessDays = price == 100 ? 5 : 3,
                PaymentEligible = false,
                DisplayOrder = i + 1
            });
        }
        await db.SaveChangesAsync(ct);
    }
    private static string Slugify(string value) => string.Join("-", value.ToLowerInvariant()
        .Replace("#", "sharp").Replace("/", " ").Split(' ', StringSplitOptions.RemoveEmptyEntries))
        .Replace("--", "-");
}
