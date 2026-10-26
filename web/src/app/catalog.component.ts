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
];
@Component({
  standalone: true,
  imports: [FormsModule,RouterLink],
  template: `
    <section class="catalog-hero">
      <div class="catalog-wrap">
        <p class="eyebrow">SMALL SOFTWARE PROBLEMS · CLEAR STARTING PRICES</p>
        <h1>Find the right fix.</h1>
        <p class="lead">Not sure what the technical problem is called? Start with what is going wrong. Browse 15 focused services, see exactly what is included, and request a scope review before committing.</p>
        <div class="catalog-trust"><span>✓ Clear deliverables</span><span>✓ Scope reviewed first</span><span>✓ No passwords or production credentials</span></div>
      </div>
    </section>
    <section class="page catalog-page">
      <div class="catalog-search">
        <label for="fix-search">What do you need help with?</label>
        <input id="fix-search" type="search" [(ngModel)]="query" placeholder="Try: website, API, spreadsheet, SQL, C#, deployment…" autocomplete="off">
        <p class="fineprint">Search by the problem you are experiencing, not just a technical term.</p>
      </div>
      <div class="catalog-controls">
        <div class="filter-block"><strong>Budget</strong><div class="filters" aria-label="Filter by price">
          @for (t of tiers; track t.label) { <button type="button" [class.selected]="tier===t.value" [attr.aria-pressed]="tier===t.value" (click)="tier=t.value">{{t.label}}</button> }
        </div></div>
        <div class="filter-block"><strong>Type of problem</strong><div class="filters" aria-label="Filter by problem">
          @for (c of categories; track c) { <button type="button" [class.selected]="category===c" [attr.aria-pressed]="category===c" (click)="category=c">{{c}}</button> }
        </div></div>
      </div>
      <div class="catalog-results-heading"><div><p class="eyebrow">EXPLORE SERVICES</p><h2>{{filtered.length}} matching {{filtered.length===1?'fix':'fixes'}}</h2></div><button class="catalog-clear" type="button" (click)="clear()" [disabled]="!query && tier==='All' && category==='All'">Clear filters</button></div>
      @if (filtered.length===0) {
        <div class="catalog-empty"><h3>Can't find an exact match?</h3><p>Tell us what's happening and we'll help determine whether a small fix is appropriate.</p><a class="button primary" routerLink="/consultation">Describe your problem →</a></div>
      }
      <div class="catalog-grid">
        @for (fix of filtered; track fix.title) {
          <article class="catalog-card">
            <div class="catalog-card-top"><span class="catalog-category">{{fix.category}}</span><span class="catalog-price">${{fix.price}}</span></div>
            <h3>{{fix.title}}</h3>
            <p class="catalog-problem">“{{fix.problem}}”</p>
            <div class="catalog-card-body"><p><strong>What you get</strong>{{fix.outcome}}</p><p><strong>Defined scope</strong>{{fix.scope}}</p></div>
            <div class="catalog-card-footer"><span>{{fix.tier}} · Scope approval required</span><a class="button primary" [routerLink]="['/consultation']" [queryParams]="{service:fix.title,price:fix.price}">Request this fix →</a></div>
          </article>
        }
      </div>
      <div class="catalog-guidance"><div><p class="eyebrow">NOT SURE WHERE TO START?</p><h2>Describe the issue. We'll help with the scope.</h2><p>Each price covers one narrowly defined issue. Complex or unclear requests are quoted separately. Work starts only after scope and availability are confirmed.</p></div><a class="button primary" routerLink="/consultation">Request a scope review →</a></div>
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
