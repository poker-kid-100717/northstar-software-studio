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
      <p class="eyebrow">YOUR IDEA STARTS HERE</p>
      <h1>What would you like to create?</h1>
      <p class="lead">You can start with an idea, a sketch, an existing app, or a problem you want to fix. Tell us what matters to you in your own words. We'll listen, explore options together, and discuss scope before any work or charges.</p>
      <div class="consultation-trust" aria-label="What to expect"><span>✓ Free to ask</span><span>✓ No payment required</span><span>✓ Your goals come first</span></div>
      @if (sent) {
        <section class="consultation-success" role="status" aria-live="polite" tabindex="-1">
          <span class="consultation-success-icon" aria-hidden="true">✓</span>
          <h2>{{ notificationPending ? 'Your request has been saved.' : 'Thanks — your request is on its way.' }}</h2>
          @if (notificationPending) { <p>Your request was saved securely, but the email notification could not be delivered. Please keep your reference number below. We cannot promise a response until delivery is restored.</p> } @else { <p>We received your inquiry. Keep an eye on <strong>{{ submittedEmail }}</strong> for a reply. We’ll review the details before discussing scope or pricing.</p> }
          @if (reference) { <p class="consultation-reference"><strong>Reference:</strong> {{ reference }}</p> }
          <p class="fineprint">This is not a booking or payment confirmation. If you don’t hear back, please check your spam folder.</p>
          <button type="button" class="button secondary" (click)="startAnother()">Send another request</button>
        </section>
      } @else {
      <form class="fixiq-panel" (ngSubmit)="submit()" #inquiryForm="ngForm">
        <div class="consultation-step"><span>01 / Your details</span><span>02 / Your vision</span><span>03 / Review & send</span></div>
        <label for="contactName">Your name</label>
        <input id="contactName" name="contactName" [(ngModel)]="contactName" required maxlength="100" autocomplete="name" placeholder="How should we address you?">
        <label for="contactEmail">Email address</label>
        <input id="contactEmail" name="contactEmail" [(ngModel)]="contactEmail" type="email" required email maxlength="254" autocomplete="email" placeholder="you@example.com" aria-describedby="email-help">
        <p class="consultation-hint" id="email-help">We’ll only use this to respond to your request.</p>
        <label for="projectType">Where would you like to start?</label>
        <select id="projectType" name="projectType" [(ngModel)]="projectType" required>
          <option value="software-repair">Fix or improve existing software</option>
          <option value="integration">Connect tools or services</option>
          <option value="automation">Make a process easier</option>
          <option value="application">Build something new</option>
          <option value="other">Explore an idea / not sure yet</option>
        </select>
        @if (selectedService) { <p class="catalog-request-context"><strong>Interested in:</strong> {{ selectedService }}. @if (selectedPrice) { <span>Listed tier: &#36;{{ selectedPrice }}.</span> } <span>We will confirm fit, deliverables, and final pricing before work begins.</span></p> }
        <label for="projectDescription">Tell us about your idea or what you'd like to change</label>
        <p class="consultation-hint" id="description-help">A few sentences are enough. What would you love to make possible? If something is broken, you can describe that too. No technical experience required. Please leave out passwords and private data.</p>
        <textarea id="projectDescription" name="projectDescription" [(ngModel)]="projectDescription" required minlength="30" maxlength="3000" rows="6" aria-describedby="description-help description-count" placeholder="For example: I have an idea for an app that helps my customers book appointments. I know what I want it to do, but I'm not sure where to start."></textarea>
        <p class="consultation-count" id="description-count">{{ projectDescription.length }} / 3000 characters <span>· Minimum 30</span></p>
        <div class="fixiq-fields">
          <div><label for="budget">Budget (optional)</label><select id="budget" name="budget" [(ngModel)]="budget"><option value="unsure">Not sure yet</option><option value="under-250">Under $250</option><option value="250-1000">$250–$1,000</option><option value="1000-5000">$1,000–$5,000</option><option value="5000-plus">$5,000+</option></select></div>
          <div><label for="timeline">Ideal timeline</label><select id="timeline" name="timeline" [(ngModel)]="timeline"><option value="flexible">Flexible</option><option value="this-week">This week</option><option value="2-4-weeks">2–4 weeks</option><option value="later">Later</option></select></div>
        </div>
        <div class="inquiry-honeypot" aria-hidden="true"><label for="website">Website</label><input id="website" name="website" [(ngModel)]="website" tabindex="-1" autocomplete="off"></div>
        <div class="consultation-verify"><strong>One last step</strong><p class="consultation-hint">Complete the quick security check to help keep spam out.</p><div id="northstar-turnstile" aria-label="Spam verification"></div></div>
        @if (verificationMessage) { <p class="fineprint" role="status">{{ verificationMessage }}</p> }
        <p class="fineprint">Do not include passwords, API keys, patient information, or confidential customer data. Sending an inquiry does not create a service agreement.</p>
        <button class="button primary consultation-submit" type="submit" [disabled]="inquiryForm.invalid || submitting || !turnstileToken">{{ submitting ? 'Sending your request…' : 'Share my idea →' }}</button>
        <p class="consultation-hint">You stay in control of your project. No commitment or charge for reaching out. We'll discuss next steps together.</p>
        @if (message) { <p class="consultation-feedback" [class.error]="error" role="alert" aria-live="assertive">{{ message }}</p> }
      </form>
      }
    </section>
  `
})
export class ConsultationComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  readonly selectedService = (this.route.snapshot.queryParamMap.get("service") ?? "").slice(0,120);
  readonly selectedPrice = [30,50,100].includes(Number(this.route.snapshot.queryParamMap.get("price"))) ? Number(this.route.snapshot.queryParamMap.get("price")) : 0;
  contactName = ''; contactEmail = ''; projectType = 'other'; projectDescription = '';
  budget = 'unsure'; timeline = 'flexible'; website = '';
  constructor() { if (this.selectedService) { this.projectType = 'software-repair'; this.projectDescription = 'I am interested in: ' + this.selectedService + '.\n\nWhat I would like to accomplish: '; } }
  submitting = false; error = false; message = ''; sent = false; submittedEmail = ''; reference = ''; notificationPending = false;
  startAnother(): void { window.location.assign('/consultation'); }
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

  private submissionError(status: number, code?: string): string {
    if (code === 'VERIFICATION_FAILED' || status === 403) return 'Spam verification was not accepted. Complete the new security check and try again. Your answers are saved on this page.';
    if (code === 'INVALID_INQUIRY' || status === 400 || status === 413 || status === 415) return 'Please review the form fields and try again. Your answers are still here.';
    if (code === 'INQUIRY_STORAGE_UNAVAILABLE' || status === 503) return 'Our inquiry system is temporarily unavailable. Your request was not saved. Please try again later; your answers are still here.';
    if (status === 502) return 'Email delivery is unavailable right now. Your answers are still here. Please try again later.';
    return 'Your request could not be submitted. Your answers are still here. Please try again.';
  }

  private submissionKey = crypto.randomUUID();
  private submissionPayload = '';
  async submit(): Promise<void> {
    if (this.submitting) return;
    if (this.contactName.trim().length < 1 || this.projectDescription.trim().length < 30 || !this.turnstileToken || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.contactEmail.trim())) {
      this.error = true;
      this.message = 'Please check your name, email, description, and spam verification before sending.';
      return;
    }
    const payload = { name:this.contactName,email:this.contactEmail,projectType:this.projectType,description:this.projectDescription,budget:this.budget,timeline:this.timeline,selectedService:this.selectedService,website:this.website };
    const fingerprint=JSON.stringify(payload);
    if(this.submissionPayload && this.submissionPayload!==fingerprint)this.submissionKey=crypto.randomUUID();
    this.submissionPayload=fingerprint;
    this.submitting = true; this.message = ''; this.error = false;
    try {
      const response = await fetch('/api/consultation-inquiries', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key':this.submissionKey },
        body: JSON.stringify({...payload,turnstileToken:this.turnstileToken})
      });
      if (!response.ok) {
        const code = await response.json().then((body: { error?: string }) => body.error).catch(() => '');
        throw new Error(this.submissionError(response.status, code));
      }
      const result = await response.json() as { ok?: boolean; reference?: string; stored?: boolean; notification?: string };
      if (!result.ok) throw new Error('Inquiry was not accepted.');
      this.reference = result.stored && result.reference ? result.reference : '';
      this.notificationPending = result.notification === 'pending';
      this.submittedEmail = this.contactEmail.trim();
      this.sent = true;
      this.message = '';
    } catch (cause) {
      this.error = true;
      this.message = cause instanceof Error && cause.message ? cause.message : 'Connection lost. Your answers are still here. Check your internet connection and try again.';
    } finally {
      this.submitting = false;
      this.turnstileToken = '';
      if (!this.sent && this.widgetId && window.turnstile) window.turnstile.reset(this.widgetId);
    }
  }
}
