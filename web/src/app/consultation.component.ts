import { Component, OnInit, OnDestroy } from '@angular/core';
declare global { interface Window { turnstile?: { render(element: HTMLElement, options: { sitekey: string; callback: (token: string) => void; 'expired-callback': () => void; 'error-callback': () => void }): string; remove(id: string): void; reset(id: string): void } } }
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { inject } from '@angular/core';

@Component({
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="page">
      <p class="eyebrow">LET'S DISCUSS YOUR PROJECT</p>
      <h1>Consultation inquiry</h1>
      <p class="lead">Tell us what you need built, repaired, or improved. We'll review the scope before discussing availability or pricing.</p>
      <form class="fixiq-panel" (ngSubmit)="submit()" #inquiryForm="ngForm">
        <label for="contactName">Your name</label>
        <input id="contactName" name="contactName" [(ngModel)]="contactName" required maxlength="100" autocomplete="name">
        <label for="contactEmail">Email address</label>
        <input id="contactEmail" name="contactEmail" [(ngModel)]="contactEmail" type="email" required email maxlength="254" autocomplete="email">
        <label for="projectType">What can we help with?</label>
        <select id="projectType" name="projectType" [(ngModel)]="projectType" required>
          <option value="software-repair">Software repair / debugging</option>
          <option value="integration">API / integration</option>
          <option value="automation">Automation / workflow</option>
          <option value="application">Application development</option>
          <option value="other">Other / unsure</option>
        </select>
        @if (selectedService) { <p class="catalog-request-context"><strong>Selected service:</strong> {{ selectedService }} · &#36;{{ selectedPrice }} starting price, subject to scope review</p> }
        <label for="projectDescription">Project description</label>
        <textarea id="projectDescription" name="projectDescription" [(ngModel)]="projectDescription" required minlength="30" maxlength="3000" rows="6" placeholder="What is happening, what should happen, and what outcome do you need?"></textarea>
        <div class="fixiq-fields">
          <div><label for="budget">Approximate budget</label><select id="budget" name="budget" [(ngModel)]="budget"><option value="unsure">Not sure yet</option><option value="under-250">Under $250</option><option value="250-1000">$250–$1,000</option><option value="1000-5000">$1,000–$5,000</option><option value="5000-plus">$5,000+</option></select></div>
          <div><label for="timeline">Timeline</label><select id="timeline" name="timeline" [(ngModel)]="timeline"><option value="flexible">Flexible</option><option value="this-week">This week</option><option value="2-4-weeks">2–4 weeks</option><option value="later">Later</option></select></div>
        </div>
        <div class="inquiry-honeypot" aria-hidden="true"><label for="website">Website</label><input id="website" name="website" [(ngModel)]="website" tabindex="-1" autocomplete="off"></div>
        <div id="northstar-turnstile" aria-label="Spam verification"></div>
        @if (verificationMessage) { <p class="fineprint" role="status">{{ verificationMessage }}</p> }
        <p class="fineprint">Do not include passwords, API keys, patient information, or confidential customer data. Sending an inquiry does not create a service agreement.</p>
        <button class="button primary" type="submit" [disabled]="inquiryForm.invalid || submitting || !turnstileToken">{{ submitting ? 'Sending…' : 'Send inquiry' }}</button>
        @if (message) { <p [class.error]="error" role="status">{{ message }}</p> }
      </form>
    </section>
  `
})
export class ConsultationComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  readonly selectedService = (this.route.snapshot.queryParamMap.get("service") ?? "").slice(0,120);
  readonly selectedPrice = [30,50,100].includes(Number(this.route.snapshot.queryParamMap.get("price"))) ? Number(this.route.snapshot.queryParamMap.get("price")) : 0;
  contactName = ''; contactEmail = ''; projectType = 'software-repair'; projectDescription = '';
  budget = 'unsure'; timeline = 'flexible'; website = '';
  constructor() { if (this.selectedService) this.projectDescription = 'I would like help with: ' + this.selectedService + '.\n\nHere is what is happening: '; }
  submitting = false; error = false; message = '';
  turnstileToken = ''; verificationMessage = 'Loading spam protection…';
  private widgetId: string | null = null;
  private destroyed = false;
  async ngOnInit(): Promise<void> {
    try {
      const response = await fetch('/api/consultation-inquiries', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Verification endpoint returned HTTP ${response.status}`);
      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) throw new Error('Verification endpoint returned a web page instead of JSON');
      const config = await response.json() as { siteKey?: string | null };
      if (!config.siteKey || this.destroyed) throw new Error('Turnstile site key is missing from the deployed configuration');
      if (!window.turnstile) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
          script.async = true; script.onload = () => resolve(); script.onerror = () => reject(new Error('Verification failed to load'));
          document.head.appendChild(script);
        });
      }
      if (this.destroyed) return;
      const element = document.getElementById('northstar-turnstile');
      if (!element || !window.turnstile) throw new Error('Verification unavailable');
      this.widgetId = window.turnstile.render(element, { sitekey: config.siteKey,
        callback: token => { this.turnstileToken = token; this.verificationMessage = ''; },
        'expired-callback': () => { this.turnstileToken = ''; this.verificationMessage = 'Verification expired. Please try again.'; },
        'error-callback': () => { this.turnstileToken = ''; this.verificationMessage = 'Verification unavailable. Please refresh.'; }
      });
      this.verificationMessage = '';
    } catch (cause) {
      if (!this.destroyed) {
        const detail = cause instanceof Error ? cause.message : 'Unknown verification error';
        console.error('Consultation verification initialization failed:', detail);
        this.verificationMessage = `Verification unavailable: ${detail}. Please refresh or contact us directly.`;
      }
    }
  }
  ngOnDestroy(): void { this.destroyed = true; if (this.widgetId && window.turnstile) window.turnstile.remove(this.widgetId); }

  async submit(): Promise<void> {
    if (this.submitting) return;
    if (this.contactName.trim().length < 1 || this.projectDescription.trim().length < 30 || !this.turnstileToken || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.contactEmail.trim())) {
      this.error = true;
      this.message = 'Please check your name, email, description, and spam verification before sending.';
      return;
    }
    this.submitting = true; this.message = ''; this.error = false;
    try {
      const response = await fetch('/api/consultation-inquiries', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: this.contactName, email: this.contactEmail, projectType: this.projectType,
          description: this.selectedService ? "Requested service: " + this.selectedService + "\n" + this.projectDescription : this.projectDescription, budget: this.budget, timeline: this.timeline, website: this.website, turnstileToken: this.turnstileToken })
      });
      if (!response.ok) throw new Error('Inquiry delivery is not available.');
      this.message = 'Your inquiry was sent. Thank you — we will review it and reply by email.';
      this.projectDescription = '';
    } catch {
      this.error = true;
      this.message = 'We could not deliver your inquiry. Please try again later.';
    } finally {
      this.submitting = false;
      this.turnstileToken = '';
      if (this.widgetId && window.turnstile) window.turnstile.reset(this.widgetId);
    }
  }
}
