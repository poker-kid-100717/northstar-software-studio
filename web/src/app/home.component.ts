import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

type Category = 'integration' | 'automation' | 'data' | 'application' | 'unsure';
type Impact = 'sales' | 'operations' | 'minor';
interface Guidance { title: string; checks: string[]; tier: string; note: string; }

@Component({
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <section class="hero">
      <div class="hero-content">
      <div class="hero-copy"><p class="eyebrow">YOUR IDEAS · YOUR WAY</p>
      <h1>You imagine it.<br><em>We help you build it.</em></h1>
      <p class="lead">Whether you're starting with a rough idea, improving something you've already built, or creating something entirely your own, we'll help you turn your vision into working software.</p>
      <div class="actions"><a class="button primary" routerLink="/consultation">Tell us your idea →</a><a class="button hero-outline" routerLink="/instant-fixes">View Instant Fixes</a></div>
      <div class="hero-benefits"><span>✦ Your vision first</span><span>⬡ Clear expectations</span><span>♡ Build together</span></div></div>
      <div class="hero-visual" aria-label="Illustration of a software solution"><div class="code-window"><div class="code-tabs">C# &nbsp; · &nbsp; .NET &nbsp; · &nbsp; Angular &nbsp; · &nbsp; SQL &nbsp; · &nbsp; AI</div><pre>public class SolutionService
&#123;
  public async Task&lt;Result&gt;
    SolveAsync(Request request)
  &#123;
    // Understand. Build. Verify.
    return await DeliverAsync(request);
  &#125;
&#125;</pre></div><div class="hero-status"><strong>✓ &nbsp; Built around your goals</strong><span>Listen to your vision</span><span>Build collaboratively</span><span>Make it yours</span></div></div></div>
    </section>
    <section class="services-overview section" id="services">
      <p class="eyebrow">WHAT WE DO</p><h2>Whatever you're imagining, let's explore it.</h2>
      <div class="cards">
        <article class="card service-tile"><div class="service-icon" aria-hidden="true">⌘</div><h3>Custom Software Development</h3><p>Have an idea for an app, a tool, or a better way to work? We can shape and build it together, using technology that fits your goals.</p><a routerLink="/consultation">Discuss a project →</a></article>
        <article class="card service-tile"><div class="service-icon" aria-hidden="true">ϟ</div><h3>Instant Fixes</h3><p>Small, defined-scope code, data, and integration issues. Transparent $30, $50, and $100 service tiers.</p><a routerLink="/instant-fixes">Browse fixes →</a></article>
        <article class="card service-tile"><div class="service-icon" aria-hidden="true">✧</div><h3>Consulting &amp; Project Inquiries</h3><p>No technical vocabulary required. Tell us what you want to create, where you're starting, and how involved you'd like to be.</p><a routerLink="/consultation">Get in touch →</a></article>
      </div>
    </section>
    <section class="featured section"><div class="feature-intro"><p class="eyebrow">FEATURED SERVICE</p><h2>Instant Fixes</h2><p class="lead">One reproducible issue. One defined deliverable. An agreed price before work begins.</p><a class="button primary" routerLink="/instant-fixes">Browse all fixes →</a></div>
      <div class="price-tiers"><article class="price-tier"><strong>$30</strong><span>QUICK FIXES</span><p>Syntax, formatting, validation, and simple request issues.</p></article><article class="price-tier"><strong>$50</strong><span>TARGETED FIXES</span><p>Isolated code bugs, API troubleshooting, data mappings, and UI fixes.</p></article><article class="price-tier"><strong>$100</strong><span>ADVANCED FIXES</span><p>Single-query tuning, webhook, automation, and pipeline investigations.</p></article></div>
    </section>
    <section id="fixiq" class="section">
      <p class="eyebrow">FIXIQ · FREE SELF-SERVICE TRIAGE</p>
      <h2>Have a technical issue? We can help with that, too.</h2>
      <p class="lead">A private, in-browser preliminary assessment. We don't send this description to a server. Do not enter passwords, API keys, patient records, or customer personal information.</p>
      <form class="fixiq-panel" (ngSubmit)="assess()">
        <label for="problem">Describe the issue</label>
        <textarea id="problem" name="problem" [(ngModel)]="problem" minlength="15" maxlength="1500" required placeholder="Example: Our website leads stopped reaching our CRM after a form update." rows="4"></textarea>
        <div class="fixiq-fields">
          <div><label for="category">What seems affected?</label><select id="category" name="category" [(ngModel)]="category">
            <option value="unsure">I'm not sure</option><option value="integration">API / webhook / integration</option><option value="automation">Automation / workflow</option><option value="data">Spreadsheet / database / import</option><option value="application">Website / application</option>
          </select></div>
          <div><label for="impact">Business impact</label><select id="impact" name="impact" [(ngModel)]="impact">
            <option value="sales">Losing leads, sales, or payments</option><option value="operations">Blocking daily work</option><option value="minor">Inconvenient, but manageable</option>
          </select></div>
        </div>
        <button class="button primary" type="submit" [disabled]="problem.trim().length < 15">Generate preliminary assessment</button>
      </form>
      @if (result) {
        <section class="fixiq-result" aria-live="polite">
          <p class="eyebrow">FIXIQ · PRELIMINARY ASSESSMENT</p>
          <h3>{{ result.title }}</h3>
          <p><strong>Priority:</strong> {{ impact === 'sales' ? 'High — revenue or customer impact' : impact === 'operations' ? 'Medium — operational disruption' : 'Standard — noncritical issue' }}</p>
          <p><strong>Suggested starting scope:</strong> {{ result.tier }}</p>
          <p>{{ result.note }}</p>
          <h4>What to check first</h4>
          <ol>@for (check of result.checks; track check) { <li>{{ check }}</li> }</ol>
          <p class="fineprint">This is rules-based triage, not an AI diagnosis or a verified root cause. No systems or files have been inspected. Final scope and price require human review.</p>
          <div class="actions"><a class="button primary" routerLink="/instant-fixes">Explore available fixes →</a><button type="button" class="button secondary" (click)="reset()">Start over</button></div>
        </section>
      }
    </section>
    <section class="section next-step" id="consulting">
      <p class="eyebrow">START WHERE YOU ARE · BUILD WHAT YOU WANT</p>
      <h2>Want to build something different?</h2>
      <div class="cards">
        <article class="card"><h3>Instant Fixes</h3><p>Clearly scoped code, SQL, API, and automation fixes from $30 to $100.</p><a routerLink="/instant-fixes">See fixed-price options →</a></article>
        <article class="card"><h3>Integration rescue</h3><p>Investigate failed webhooks, missing CRM leads, broken data syncs, and invoice workflows.</p><a routerLink="/consultation">Request scope review →</a></article>
        <article class="card"><h3>AI-built app stabilization</h3><p>Make fragile prototypes safer to maintain through targeted debugging, tests, and deployment reviews.</p><a routerLink="/consultation">Discuss your application →</a></article>
      </div>
      <p class="fineprint">FixIQ Watch monitoring is on the roadmap. We do not currently offer 24/7 monitoring, guaranteed response times, or automatic repairs.</p>
    </section>
    <section class="tech-strip" aria-label="Technologies"><span>TECHNOLOGIES</span><strong>.NET</strong><strong>Angular</strong><strong>SQL Server</strong><strong>Azure</strong><strong>Docker</strong><strong>AI Integrations</strong><strong>GitHub Actions</strong><strong>Cloudflare</strong></section>
  `
})
export class HomeComponent {
  problem = '';
  category: Category = 'unsure';
  impact: Impact = 'operations';
  result: Guidance | null = null;

  assess(): void {
    if (this.problem.trim().length < 15) return;
    const value = this.problem.toLowerCase();
    const detected: Category = this.category !== 'unsure' ? this.category :
      /webhook|api|crm|sync|integration|401|400/.test(value) ? 'integration' :
      /automation|zapier|workflow|trigger/.test(value) ? 'automation' :
      /csv|excel|spreadsheet|sql|database|import/.test(value) ? 'data' : 'application';
    const guidance: Record<Category, Guidance> = {
      integration: { title: 'Possible integration or delivery failure', tier: 'API / webhook troubleshooting ($50–$100 if narrowly scoped)', checks: ['Identify the last successful request and first failed request.', 'Compare recent changes to credentials, endpoints, payloads, and permissions.', 'Inspect sanitized HTTP status codes, retry history, and delivery logs.'], note: 'Missing deliveries may be caused by authorization, payload changes, downtime, or routing. The cause is not yet verified.' },
      automation: { title: 'Possible automation or trigger failure', tier: 'Small automation repair ($100 if narrowly scoped)', checks: ['Confirm the trigger still fires and the workflow is enabled.', 'Check task history for errors, rate limits, or expired connections.', 'Test with non-sensitive sample data and verify the downstream result.'], note: 'An automation may appear active while silently failing to complete its downstream action.' },
      data: { title: 'Possible data mapping or query issue', tier: 'CSV mapping / SQL repair ($30–$100 if narrowly scoped)', checks: ['Identify the exact input format and expected output.', 'Compare schema, column names, data types, and recent changes.', 'Reproduce with synthetic or anonymized sample rows.'], note: 'We need a reproducible example before estimating any production data repair.' },
      application: { title: 'Possible application regression', tier: 'Targeted code or UI repair ($30–$100 if narrowly scoped)', checks: ['Identify the exact action, expected behavior, and actual behavior.', 'Capture sanitized browser console or server errors.', 'Compare the last working release with the current version.'], note: 'This may require a deeper assessment if multiple systems or features are affected.' },
      unsure: { title: 'General software troubleshooting', tier: 'Scope review required', checks: ['Identify what stopped working and when.', 'Capture the error without secrets or customer information.', 'Document the business impact and last known working state.'], note: 'More detail is needed to choose a repair category.' }
    };
    this.result = guidance[detected];
  }
  reset(): void { this.result = null; this.problem = ''; this.category = 'unsure'; this.impact = 'operations'; }
}
