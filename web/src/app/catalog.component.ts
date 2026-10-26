import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

type Tier = 'Quick Fixes' | 'Targeted Fixes' | 'Advanced Fixes';
interface Fix {
  title: string; problem: string; outcome: string; scope: string; category: string; tier: Tier; price: number;
}
const services: Fix[] = [
  {title:'SQL Query Syntax Fix',problem:'My SQL query will not run.',outcome:'A corrected statement and explanation of the error.',scope:'One supplied query; no database redesign.',category:'Data & spreadsheets',tier:'Quick Fixes',price:30},
  {title:'JSON / CSV Formatting Repair',problem:'My data file is rejected or malformed.',outcome:'One corrected sample file or payload.',scope:'One small, redacted file or JSON payload.',category:'Data & spreadsheets',tier:'Quick Fixes',price:30},
  {title:'Regex or Validation Fix',problem:'A form rejects valid information.',outcome:'One corrected validation rule with examples.',scope:'One field or regular expression.',category:'Websites & forms',tier:'Quick Fixes',price:30},
  {title:'C# Compilation Error Fix',problem:'My .NET code will not compile.',outcome:'A targeted correction with a short explanation.',scope:'One reproducible compiler error in an isolated snippet.',category:'Code & .NET',tier:'Quick Fixes',price:30},
  {title:'API Request Formatting Fix',problem:'My API request has the wrong format.',outcome:'A corrected sample request and explanation.',scope:'One endpoint request; no server-side changes.',category:'APIs & integrations',tier:'Quick Fixes',price:30},
  {title:'SQL Query Correction',problem:'My SQL query returns the wrong results.',outcome:'One corrected query with a verification example.',scope:'One query and sample data; no schema changes.',category:'Data & spreadsheets',tier:'Targeted Fixes',price:50},
  {title:'C# Method Bug Fix',problem:'One method is producing the wrong result.',outcome:'A targeted code correction and suggested test.',scope:'One isolated method with reproduction steps.',category:'Code & .NET',tier:'Targeted Fixes',price:50},
  {title:'Excel / CSV Import Mapping',problem:'Imported columns are ending up in the wrong fields.',outcome:'One corrected mapping or transformation.',scope:'One import mapping using redacted sample rows.',category:'Data & spreadsheets',tier:'Targeted Fixes',price:50},
  {title:'API 400/401 Troubleshooting',problem:'My API returns a 400 or 401 error.',outcome:'A request-level diagnosis and safe corrective guidance.',scope:'One request path; no credential sharing or provider changes.',category:'APIs & integrations',tier:'Targeted Fixes',price:50},
  {title:'HTML / CSS Layout Fix',problem:'One part of my website looks broken.',outcome:'A focused markup or CSS correction.',scope:'One component or responsive layout issue.',category:'Websites & forms',tier:'Targeted Fixes',price:50},
  {title:'SQL Performance Quick Tune',problem:'A specific SQL query is unusually slow.',outcome:'A reviewed query and targeted tuning recommendations.',scope:'One query and available execution-plan evidence; no guaranteed speedup.',category:'Data & spreadsheets',tier:'Advanced Fixes',price:100},
  {title:'API Endpoint Bug Repair',problem:'One API endpoint behaves incorrectly.',outcome:'A targeted patch or documented root cause.',scope:'One reproducible endpoint; no multi-service redesign.',category:'APIs & integrations',tier:'Advanced Fixes',price:100},
  {title:'Small Automation Repair',problem:'One scheduled script or workflow stopped working.',outcome:'A focused correction or clear next-step diagnosis.',scope:'One script or automation path.',category:'Automation & deployment',tier:'Advanced Fixes',price:100},
  {title:'Webhook Delivery Troubleshooting',problem:'A webhook is not arriving or processing.',outcome:'A delivery-path diagnosis and targeted fix where feasible.',scope:'One webhook event and destination; no platform-wide rebuild.',category:'APIs & integrations',tier:'Advanced Fixes',price:100},
  {title:'CI/CD Pipeline Repair',problem:'My GitHub Actions build or deployment fails.',outcome:'A targeted workflow correction or root-cause report.',scope:'One reproducible pipeline failure; no infrastructure migration.',category:'Automation & deployment',tier:'Advanced Fixes',price:100}
,  {title:"Broken Link or Button Fix",problem:"A link or button does nothing.",outcome:"One corrected link or click handler.",scope:"One link or button.",category:"Websites & forms",tier:"Quick Fixes",price:30},
  {title:"Form Field Validation Fix",problem:"A form rejects a valid value.",outcome:"One corrected validation rule.",scope:"One form field.",category:"Websites & forms",tier:"Quick Fixes",price:30},
  {title:"Website Text or Image Fix",problem:"A page shows the wrong text or image.",outcome:"One corrected content element.",scope:"One page element; assets supplied.",category:"Websites & forms",tier:"Quick Fixes",price:30},
  {title:"Mobile Menu Layout Fix",problem:"The navigation breaks on phones.",outcome:"One responsive navigation correction.",scope:"One menu component.",category:"Websites & forms",tier:"Targeted Fixes",price:50},
  {title:"Contact Form Submission Fix",problem:"My contact form will not submit.",outcome:"A targeted client-side form correction.",scope:"One form; email delivery issues quoted separately.",category:"Websites & forms",tier:"Targeted Fixes",price:50},
  {title:"Responsive Overflow Fix",problem:"My page scrolls sideways on mobile.",outcome:"One responsive CSS correction.",scope:"One page section.",category:"Websites & forms",tier:"Targeted Fixes",price:50},
  {title:"Browser Console Error Fix",problem:"A website shows an error in the console.",outcome:"Diagnosis and correction of one reproducible error.",scope:"One client-side error.",category:"Websites & forms",tier:"Targeted Fixes",price:50},
  {title:"Website Accessibility Quick Fix",problem:"One page is difficult to use with a keyboard.",outcome:"Correction of one defined accessibility issue.",scope:"One component; not a full compliance audit.",category:"Websites & forms",tier:"Advanced Fixes",price:100},
  {title:"Form Email Delivery Diagnosis",problem:"Form submissions do not reach my inbox.",outcome:"Diagnosis of one form-to-email delivery path.",scope:"One form and sender configuration; no DNS overhaul.",category:"Websites & forms",tier:"Advanced Fixes",price:100},
  {title:"Website Performance Quick Review",problem:"One page loads unusually slowly.",outcome:"A focused performance diagnosis and recommendations.",scope:"One page and supplied performance evidence.",category:"Websites & forms",tier:"Advanced Fixes",price:100},
  {title:"API Header Fix",problem:"An API request is missing required headers.",outcome:"One corrected example request.",scope:"One endpoint request; no secret sharing.",category:"APIs & integrations",tier:"Quick Fixes",price:30},
  {title:"JSON Payload Shape Fix",problem:"An API rejects my JSON body.",outcome:"One corrected request payload.",scope:"One request body.",category:"APIs & integrations",tier:"Quick Fixes",price:30},
  {title:"HTTP Status Code Explanation",problem:"I do not understand an API error.",outcome:"An explanation and reproducible next step.",scope:"One error response and request example.",category:"APIs & integrations",tier:"Quick Fixes",price:30},
  {title:"API Pagination Fix",problem:"My integration misses later pages.",outcome:"One corrected pagination routine.",scope:"One endpoint and pagination flow.",category:"APIs & integrations",tier:"Targeted Fixes",price:50},
  {title:"API Date Format Fix",problem:"Dates are rejected by an integration.",outcome:"One corrected date serialization or parsing rule.",scope:"One field and endpoint.",category:"APIs & integrations",tier:"Targeted Fixes",price:50},
  {title:"CORS Configuration Diagnosis",problem:"My browser cannot call an API.",outcome:"Diagnosis and a narrowly scoped configuration recommendation.",scope:"One browser origin and endpoint.",category:"APIs & integrations",tier:"Targeted Fixes",price:50},
  {title:"API Response Mapping Fix",problem:"My app reads the wrong API fields.",outcome:"One corrected response mapping.",scope:"One response schema.",category:"APIs & integrations",tier:"Targeted Fixes",price:50},
  {title:"OAuth Token Refresh Diagnosis",problem:"An integration stops when tokens expire.",outcome:"A targeted token lifecycle diagnosis or patch.",scope:"One integration flow; no credential sharing.",category:"APIs & integrations",tier:"Advanced Fixes",price:100},
  {title:"Webhook Signature Validation Fix",problem:"A webhook signature check fails.",outcome:"One corrected signature validation implementation.",scope:"One webhook provider and event.",category:"APIs & integrations",tier:"Advanced Fixes",price:100},
  {title:"API Retry Logic Fix",problem:"Temporary API failures break my process.",outcome:"A focused retry/backoff correction.",scope:"One request path; no distributed redesign.",category:"APIs & integrations",tier:"Advanced Fixes",price:100},
  {title:"Spreadsheet Formula Fix",problem:"One formula returns the wrong result.",outcome:"One corrected formula with an explanation.",scope:"One formula and redacted sample cells.",category:"Data & spreadsheets",tier:"Quick Fixes",price:30},
  {title:"CSV Delimiter Repair",problem:"A CSV opens with columns merged together.",outcome:"One corrected delimiter or quoting example.",scope:"One small CSV sample.",category:"Data & spreadsheets",tier:"Quick Fixes",price:30},
  {title:"Date Format Conversion",problem:"Dates import in the wrong format.",outcome:"One conversion rule and corrected sample.",scope:"One date field.",category:"Data & spreadsheets",tier:"Quick Fixes",price:30},
  {title:"Duplicate Row Detection",problem:"My spreadsheet contains repeated records.",outcome:"One repeatable duplicate-detection formula or query.",scope:"One sheet or query and key definition.",category:"Data & spreadsheets",tier:"Targeted Fixes",price:50},
  {title:"Spreadsheet Lookup Fix",problem:"A lookup returns missing or incorrect values.",outcome:"One corrected lookup formula.",scope:"One lookup and supplied sample data.",category:"Data & spreadsheets",tier:"Targeted Fixes",price:50},
  {title:"CSV Encoding Repair",problem:"Special characters break during import.",outcome:"One encoding correction and sample output.",scope:"One input file format.",category:"Data & spreadsheets",tier:"Targeted Fixes",price:50},
  {title:"SQL Join Result Fix",problem:"My join duplicates or drops records.",outcome:"One corrected join with a verification example.",scope:"One query and sample tables.",category:"Data & spreadsheets",tier:"Targeted Fixes",price:50},
  {title:"Data Cleanup Script Fix",problem:"A data cleanup script fails on some rows.",outcome:"A targeted correction with test cases.",scope:"One existing script and redacted samples.",category:"Data & spreadsheets",tier:"Advanced Fixes",price:100},
  {title:"Import Error Diagnosis",problem:"A data import fails partway through.",outcome:"A root-cause report and targeted correction if feasible.",scope:"One import step and error log.",category:"Data & spreadsheets",tier:"Advanced Fixes",price:100},
  {title:"SQL Index Recommendation",problem:"A known query needs index guidance.",outcome:"One evidence-based index recommendation or explanation.",scope:"One query and available execution plan; no guaranteed speedup.",category:"Data & spreadsheets",tier:"Advanced Fixes",price:100},
  {title:"Null Reference Error Fix",problem:"My C# code crashes on a null value.",outcome:"One null-safety correction.",scope:"One isolated exception path.",category:"Code & .NET",tier:"Quick Fixes",price:30},
  {title:"Type Conversion Fix",problem:"My code cannot convert one data type.",outcome:"One corrected conversion with an example.",scope:"One conversion expression.",category:"Code & .NET",tier:"Quick Fixes",price:30},
  {title:"LINQ Syntax Fix",problem:"A LINQ expression will not compile.",outcome:"One corrected LINQ expression.",scope:"One query expression.",category:"Code & .NET",tier:"Quick Fixes",price:30},
  {title:"LINQ Wrong Results Fix",problem:"A LINQ query returns unexpected data.",outcome:"One corrected query and test example.",scope:"One query and sample inputs.",category:"Code & .NET",tier:"Targeted Fixes",price:50},
  {title:"Dependency Injection Registration Fix",problem:"A .NET service cannot be resolved.",outcome:"One targeted DI registration correction.",scope:"One missing registration path.",category:"Code & .NET",tier:"Targeted Fixes",price:50},
  {title:"Async Await Bug Fix",problem:"An asynchronous method behaves incorrectly.",outcome:"One corrected async method or call site.",scope:"One reproducible method path.",category:"Code & .NET",tier:"Targeted Fixes",price:50},
  {title:"Unit Test Failure Fix",problem:"One unit test fails unexpectedly.",outcome:"A focused test or implementation correction.",scope:"One reproducible test.",category:"Code & .NET",tier:"Targeted Fixes",price:50},
  {title:"EF Core Tracking Bug Fix",problem:"EF Core updates or reads unexpected entities.",outcome:"One targeted EF Core query or tracking correction.",scope:"One entity operation.",category:"Code & .NET",tier:"Advanced Fixes",price:100},
  {title:"ASP.NET Middleware Error Fix",problem:"One request fails inside middleware.",outcome:"A targeted middleware diagnosis and correction.",scope:"One middleware path.",category:"Code & .NET",tier:"Advanced Fixes",price:100},
  {title:"Small .NET Refactor",problem:"One method is difficult to maintain.",outcome:"A focused refactor preserving existing behavior.",scope:"One method with existing tests or examples.",category:"Code & .NET",tier:"Advanced Fixes",price:100},
  {title:"GitHub Actions YAML Syntax Fix",problem:"My workflow file has a syntax error.",outcome:"One corrected YAML expression or key.",scope:"One workflow syntax issue.",category:"Automation & deployment",tier:"Quick Fixes",price:30},
  {title:"Cron Schedule Fix",problem:"My scheduled task runs at the wrong time.",outcome:"One corrected cron schedule with timezone explanation.",scope:"One schedule definition.",category:"Automation & deployment",tier:"Quick Fixes",price:30},
  {title:"Environment Variable Name Fix",problem:"My script cannot read a configured variable.",outcome:"One corrected variable reference.",scope:"One variable; never share its secret value.",category:"Automation & deployment",tier:"Quick Fixes",price:30},
  {title:"GitHub Actions Path Filter Fix",problem:"My workflow runs on the wrong files.",outcome:"One corrected trigger or path filter.",scope:"One workflow trigger.",category:"Automation & deployment",tier:"Targeted Fixes",price:50},
  {title:"Build Command Fix",problem:"My deployment uses the wrong build command.",outcome:"One corrected command and configuration guidance.",scope:"One build step.",category:"Automation & deployment",tier:"Targeted Fixes",price:50},
  {title:"Scheduled Job Trigger Fix",problem:"My scheduled automation never starts.",outcome:"A targeted trigger configuration correction.",scope:"One scheduled job.",category:"Automation & deployment",tier:"Targeted Fixes",price:50},
  {title:"Deployment Environment Mapping Fix",problem:"My app reads the wrong deployment setting.",outcome:"One corrected nonsecret environment mapping.",scope:"One environment and variable mapping.",category:"Automation & deployment",tier:"Targeted Fixes",price:50},
  {title:"Docker Compose Startup Fix",problem:"My containers fail to start together.",outcome:"One focused Compose configuration correction.",scope:"One reproducible startup failure.",category:"Automation & deployment",tier:"Advanced Fixes",price:100},
  {title:"Cloudflare Pages Routing Fix",problem:"My deployed site returns a 404 on refresh.",outcome:"A targeted SPA routing configuration correction.",scope:"One Pages project and route pattern.",category:"Automation & deployment",tier:"Advanced Fixes",price:100},
  {title:"GitHub Actions Artifact Fix",problem:"My pipeline does not publish its build output.",outcome:"One corrected artifact upload/download step.",scope:"One workflow artifact path.",category:"Automation & deployment",tier:"Advanced Fixes",price:100}
];
@Component({
  standalone: true,
  imports: [FormsModule,RouterLink],
  template: `
    <section class="catalog-hero">
      <div class="catalog-wrap">
        <p class="eyebrow">SMALL SOFTWARE PROBLEMS · CLEAR STARTING PRICES</p>
        <h1>Find the right fix.</h1>
        <p class="lead">Not sure what the technical problem is called? Start with what is going wrong. Explore focused services, see what's included, and ask about the right fit before committing.</p>
        <div class="catalog-trust"><span>✓ Clear deliverables</span><span>✓ Scope reviewed first</span><span>✓ No passwords or production credentials</span></div>
      </div>
    </section>
    <section class="page catalog-page">
      <div class="catalog-search">
        <label for="fix-search">What do you need help with?</label>
        <input id="fix-search" type="search" [(ngModel)]="query" placeholder="Try: website, API, spreadsheet, SQL, C#, deployment…" autocomplete="off">
        <p class="fineprint">Search by the problem you are experiencing, not just a technical term.</p>
      </div>
      <p class="catalog-intro">Not sure which service fits? That's okay. These are starting points, not limits on what we can build together.</p>
      <div class="catalog-controls">
        <div class="filter-block"><strong>Budget</strong><div class="filters" aria-label="Filter by price">
          @for (t of tiers; track t.label) { <button type="button" [class.selected]="tier===t.value" [attr.aria-pressed]="tier===t.value" (click)="tier=t.value">{{t.label}}</button> }
        </div></div>
        <div class="filter-block"><strong>Type of problem</strong><div class="filters" aria-label="Filter by problem">
          @for (c of categories; track c) { <button type="button" [class.selected]="category===c" [attr.aria-pressed]="category===c" (click)="category=c">{{c}}</button> }
        </div></div>
      </div>
      <div class="catalog-results-heading" aria-live="polite"><div><p class="eyebrow">EXPLORE SERVICES</p><h2>{{filtered.length}} matching {{filtered.length===1?'fix':'fixes'}}</h2></div><button class="catalog-clear" type="button" (click)="clear()" [disabled]="!query && tier==='All' && category==='All'">Clear filters</button></div>
      @if (filtered.length===0) {
        <div class="catalog-empty"><h3>Can't find an exact match?</h3><p>You don't need to know the technical name. Share what you want to change or create, and we'll explore options with you.</p><a class="button primary" routerLink="/consultation">Tell us your idea →</a></div>
      }
      <div class="catalog-grid">
        @for (fix of filtered; track fix.title) {
          <article class="catalog-card">
            <div class="catalog-card-top"><span class="catalog-category">{{fix.category}}</span><span class="catalog-price">&#36;{{fix.price}}</span></div>
            <h3>{{fix.title}}</h3>
            <p class="catalog-problem">“{{fix.problem}}”</p>
            <div class="catalog-card-body"><p><strong>What you get</strong>{{fix.outcome}}</p><p><strong>Defined scope</strong>{{fix.scope}}</p></div>
            <div class="catalog-card-footer"><span>{{fix.tier}} · Scope approval required</span><a class="button primary" [routerLink]="['/consultation']" [queryParams]="{service:fix.title,price:fix.price}">Request this fix →</a></div>
          </article>
        }
      </div>
      <div class="catalog-guidance"><div><p class="eyebrow">NOT SURE WHERE TO START?</p><h2>Have something else in mind? Let's talk.</h2><p>These fixed-price options cover narrowly defined issues. If your idea is bigger, different, or still taking shape, tell us about it. We'll discuss the scope and price together before any work begins.</p></div><a class="button primary" routerLink="/consultation">Discuss your idea →</a></div>
      <p class="fineprint catalog-disclaimer">Prices are proposed starting prices, not automatic purchase offers. One reasonable revision within the accepted scope; estimated turnaround is discussed after review. No payment is collected here. Never send secrets, credentials, protected health information, or confidential customer data.</p>
    </section>
  `
})
export class CatalogComponent {
  readonly services=services;
  readonly tiers=[{label:'All prices',value:'All'},{label:'$30 · Quick',value:'Quick Fixes'},{label:'$50 · Targeted',value:'Targeted Fixes'},{label:'$100 · Advanced',value:'Advanced Fixes'}];
  readonly categories=['All','Websites & forms','APIs & integrations','Data & spreadsheets','Code & .NET','Automation & deployment'];
  query=''; tier='All'; category='All';
  get filtered():Fix[] {
    const q=this.query.trim().toLowerCase();
    return this.services.filter(f=>(this.tier==='All'||f.tier===this.tier)&&(this.category==='All'||f.category===this.category)&&(!q||[f.title,f.problem,f.outcome,f.scope,f.category,f.tier].join(' ').toLowerCase().includes(q)));
  }
  clear(){this.query='';this.tier='All';this.category='All';}
}
