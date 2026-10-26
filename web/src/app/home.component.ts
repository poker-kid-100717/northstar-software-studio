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
      <p class="eyebrow">NORTHSTAR FIXIQ · SOFTWARE RESCUE</p>
      <h1>Something broke.<br><em>Let's find the right fix.</em></h1>
      <p class="lead">When software, integrations, or automations stop working, get a clear starting point and a realistic repair path. No open-ended consulting commitment.</p>
      <div class="actions"><a class="button primary" href="#fixiq">Try FixIQ triage →</a><a class="button secondary" routerLink="/instant-fixes">Browse $30–$100 fixes</a></div>
    </section>
    <section id="fixiq" class="section">
      <p class="eyebrow">START HERE · NO ACCOUNT REQUIRED</p>
      <h2>Tell us what's broken.</h2>
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
    <section class="section" id="consulting">
      <p class="eyebrow">FOCUSED REPAIRS · DOCUMENTED RESULTS</p>
      <h2>Small problems deserve a clear solution.</h2>
      <div class="cards">
        <article class="card"><h3>Instant Fixes</h3><p>Clearly scoped code, SQL, API, and automation fixes from $30 to $100.</p><a routerLink="/instant-fixes">See fixed-price options →</a></article>
        <article class="card"><h3>Integration rescue</h3><p>Investigate failed webhooks, missing CRM leads, broken data syncs, and invoice workflows.</p><span class="muted">Quoted after scope review · Not yet available for purchase</span></article>
        <article class="card"><h3>AI-built app stabilization</h3><p>Make fragile prototypes safer to maintain through targeted debugging, tests, and deployment reviews.</p><span class="muted">Quoted after scope review · Not yet available for purchase</span></article>
      </div>
      <p class="fineprint">FixIQ Watch monitoring is on the roadmap. We do not currently offer 24/7 monitoring, guaranteed response times, or automatic repairs.</p>
    </section>
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
