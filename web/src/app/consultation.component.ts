import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
declare global { interface Window { turnstile?: { render(element: HTMLElement, options: { sitekey: string; callback: (token: string) => void; 'expired-callback': () => void; 'error-callback': () => void }): string; remove(id: string): void; reset(id: string): void } } }
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { inject } from '@angular/core';

@Component({
  standalone: true,
  imports: [FormsModule],
  styleUrl: './consultation.component.css',
  template: `
    <section class="page consultation-page">
      <p class="eyebrow">YOUR IDEA STARTS HERE</p>
      <h1>What would you like to create?</h1>
      <p class="lead">You can start with an idea, a sketch, an existing app, or a problem you want to fix. Tell us what matters to you in your own words. We'll listen, explore options together, and discuss scope before any work or charges.</p>
      <div class="consultation-trust" aria-label="What to expect"><span>✓ Free to ask</span><span>✓ No payment required</span><span>✓ Your goals come first</span></div>
      @if (sent) {
        <section class="consultation-success" role="status" aria-live="polite" tabindex="-1" id="consultation-confirmation" aria-labelledby="confirmation-title">
          <span class="consultation-success-icon" aria-hidden="true">✓</span>
          <h2 id="confirmation-title">{{ notificationPending ? 'Your request has been saved.' : 'Thanks — your request is on its way.' }}</h2>
          @if (notificationPending) { <p>Your request was saved securely, but the email notification could not be delivered. Please keep your reference number below. We cannot promise a response until delivery is restored.</p> } @else { <p>We received your inquiry. Keep an eye on <strong>{{ submittedEmail }}</strong> for a reply. We’ll review the details before discussing scope or pricing.</p> }
          @if (reference) { <p class="consultation-reference"><strong>Reference:</strong> {{ reference }}</p> }
          <p class="fineprint">This is not a booking or payment confirmation. If you don’t hear back, please check your spam folder.</p>
          <button type="button" class="button secondary" (click)="startAnother()">Send another request</button>
        </section>
      } @else {
      <form class="fixiq-panel" (ngSubmit)="submit()" #inquiryForm="ngForm" [attr.aria-busy]="submitting">
        <div class="consultation-step"><span>01 / Your details</span><span>02 / Your vision</span><span>03 / Review & send</span></div>
        <label for="contactName">Your name</label>
        <input id="contactName" name="contactName" #nameField="ngModel" [attr.aria-invalid]="showError('name',nameField.touched)" aria-describedby="name-error" [(ngModel)]="contactName" required maxlength="100" autocomplete="name" placeholder="How should we address you?">
        <p id="name-error" class="field-error">@if (showError("name",nameField.touched)) { {{fieldErrors["name"]}} }</p>
        <label for="contactEmail">Email address</label>
        <input id="contactEmail" name="contactEmail" #emailField="ngModel" [attr.aria-invalid]="showError('email',emailField.touched)" [(ngModel)]="contactEmail" type="email" required email maxlength="254" autocomplete="email" placeholder="you@example.com" aria-describedby="email-help email-error">
        <p class="consultation-hint" id="email-help">We’ll only use this to respond to your request.</p>
        <p id="email-error" class="field-error">@if (showError("email",emailField.touched)) { {{fieldErrors["email"]}} }</p>
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
        <p class="consultation-hint" id="description-help">A few sentences are enough. What would you love to make possible? If something is broken, you can describe that too. No technical experience required. Please leave out passwords, patient information, and confidential data.</p>
        <textarea id="projectDescription" name="projectDescription" #descriptionField="ngModel" [attr.aria-invalid]="showError('description',descriptionField.touched)" [(ngModel)]="projectDescription" required minlength="30" maxlength="3000" rows="6" aria-describedby="description-help description-count description-error" placeholder="For example: I have an idea for an app that helps my customers book appointments. I know what I want it to do, but I'm not sure where to start."></textarea>
        <p id="description-error" class="field-error">@if (showError("description",descriptionField.touched)) { {{fieldErrors["description"]}} }</p>
        <p class="consultation-count" id="description-count">{{ projectDescription.length }} / 3000 characters <span>· Minimum 30</span></p>
        <div class="fixiq-fields">
          <div><label for="budget">Budget (optional)</label><select id="budget" name="budget" [(ngModel)]="budget"><option value="unsure">Not sure yet</option><option value="under-250">Under $250</option><option value="250-1000">$250–$1,000</option><option value="1000-5000">$1,000–$5,000</option><option value="5000-plus">$5,000+</option></select></div>
          <div><label for="timeline">Ideal timeline</label><select id="timeline" name="timeline" [(ngModel)]="timeline"><option value="flexible">Flexible</option><option value="this-week">This week</option><option value="2-4-weeks">2–4 weeks</option><option value="later">Later</option></select></div>
        </div>
        <div class="inquiry-honeypot" aria-hidden="true"><label for="website">Website</label><input id="website" name="website" [(ngModel)]="website" tabindex="-1" autocomplete="off"></div>
        <div class="consultation-verify"><strong>One last step</strong><p class="consultation-hint">Complete the quick security check to help keep spam out.</p><div id="northstar-turnstile" aria-label="Spam verification"></div></div>
        @if (verificationMessage) { <p class="fineprint" role="status">{{ verificationMessage }}</p> }
        @if (!turnstileToken && !verificationLoading) { <button type="button" class="button secondary" (click)="retryVerification()">Retry security check</button> }
        <p class="fineprint">Do not include passwords, API keys, patient information, or confidential customer data. Sending an inquiry does not create a service agreement.</p>
        <button class="button primary consultation-submit" type="submit" [disabled]="submitting || !turnstileToken">{{ submitting ? 'Sending your request…' : 'Share my idea →' }}</button>
        @if (submitting) { <p role="status">Sending your request. Please wait…</p> }
        <p class="consultation-hint">You stay in control of your project. No commitment or charge for reaching out. We'll discuss next steps together.</p>
        @if (message) { <p class="consultation-feedback" [class.error]="error" role="alert" aria-live="assertive" id="submission-feedback" tabindex="-1">{{ message }}</p> }
      </form>
      }
    </section>
  `
})
export class ConsultationComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly zone = inject(NgZone);
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
  verificationLoading = false;
  attempted = false;
  get fieldErrors():Record<string,string> {
    const errors:Record<string,string>={};
    if(!this.contactName.trim() || this.contactName.trim().length>100)errors['name']='Enter your name (up to 100 characters).';
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.contactEmail.trim()) || this.contactEmail.trim().length>254)errors['email']='Enter a valid email address, such as you@example.com.';
    if(this.projectDescription.trim().length<30 || this.projectDescription.trim().length>3000)errors['description']='Describe your idea in 30 to 3,000 characters.';
    return errors;
  }
  showError(field:string,touched:boolean|null):boolean {return !!this.fieldErrors[field] && (!!touched || this.attempted);}
  private focusAfterRender(selector:string):void {setTimeout(()=>{if(!this.destroyed)document.querySelector<HTMLElement>(selector)?.focus();});}
  async retryVerification():Promise<void> {
    if(this.verificationLoading || this.submitting)return;
    this.turnstileToken='';
    if(this.widgetId && window.turnstile) {
      window.turnstile.reset(this.widgetId);
      this.verificationMessage='Complete the security check to continue.';
    } else await this.ngOnInit();
  }

  async ngOnInit(): Promise<void> {
    if(this.verificationLoading || this.destroyed)return;
    this.verificationLoading=true;
    this.verificationMessage="Loading security check…";
    try {
      const response = await fetch('/api/consultation-inquiries', { cache: 'no-store', signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error(`Verification endpoint returned HTTP ${response.status}`);
      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) throw new Error('Verification endpoint returned a web page instead of JSON');
      const config = await response.json() as { siteKey?: string | null };
      if (!config.siteKey || this.destroyed) throw new Error('Turnstile site key is missing from the deployed configuration');
      if (!window.turnstile) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
          const timer = setTimeout(() => { script.remove(); reject(new Error('Verification timed out')); },12000);
          script.async = true; script.onload = () => {clearTimeout(timer);resolve();}; script.onerror = () => {clearTimeout(timer);script.remove();reject(new Error('Verification failed to load'));};
          document.head.appendChild(script);
        });
      }
      if (this.destroyed) return;
      const element = document.getElementById('northstar-turnstile');
      if (!element || !window.turnstile) throw new Error('Verification unavailable');
      this.widgetId = window.turnstile.render(element, { sitekey: config.siteKey,
        callback: token => this.zone.run(() => { this.turnstileToken = token; this.verificationMessage = ''; }),
        'expired-callback': () => this.zone.run(() => { this.turnstileToken = ''; this.verificationMessage = 'Verification expired. Please try again.'; }),
        'error-callback': () => this.zone.run(() => { this.turnstileToken = ''; this.verificationMessage = 'The security check failed. Please retry. Your answers are still here.'; })
      });
      this.verificationMessage = '';
    } catch {
      if (!this.destroyed) this.verificationMessage = 'The security check is unavailable. Check your connection and retry. Your answers will stay on this page.';
    } finally { this.verificationLoading=false; }
  }
  ngOnDestroy(): void { this.destroyed = true; if (this.widgetId && window.turnstile) window.turnstile.remove(this.widgetId); }

  private submissionError(status: number, code?: string): string {
    if (status === 429) return 'Too many attempts were made from this network. Please try again later. Your answers are still here.';
    if (status === 409) return 'This request changed while it was being sent. Review your details and try again.';
    if (code === 'VERIFICATION_FAILED' || status === 403) return 'Spam verification was not accepted. Complete the new security check and try again. Your answers are saved on this page.';
    if (code === 'INVALID_INQUIRY' || status === 400 || status === 413 || status === 415) return 'Please review the form fields and try again. Your answers are still here.';
    if (code === 'INQUIRY_STORAGE_UNAVAILABLE' || status === 503) return 'Our inquiry system is temporarily unavailable. Your request was not saved. Please try again later; your answers are still here.';
    if (status === 502) return 'We could not confirm that your request was saved. Please retry; your answers are still here.';
    return 'Your request could not be submitted. Your answers are still here. Please try again.';
  }

  private submissionKey = crypto.randomUUID();
  private submissionPayload = '';
  async submit(): Promise<void> {
    if (this.submitting) return;
    this.attempted=true;
    if (Object.keys(this.fieldErrors).length || !this.turnstileToken) {
      this.error = true;
      this.message = 'Please check the highlighted fields and complete the security check before sending.';
      this.focusAfterRender('[aria-invalid="true"]');
      return;
    }
    const payload = { name:this.contactName,email:this.contactEmail,projectType:this.projectType,description:this.projectDescription,budget:this.budget,timeline:this.timeline,selectedService:this.selectedService,website:this.website };
    const fingerprint=JSON.stringify(payload);
    if(this.submissionPayload && this.submissionPayload!==fingerprint)this.submissionKey=crypto.randomUUID();
    this.submissionPayload=fingerprint;
    this.submitting = true; this.message = ''; this.error = false;
    try {
      const response = await fetch('/api/consultation-inquiries', {
        method: 'POST', signal:AbortSignal.timeout(20000), headers: { 'Content-Type': 'application/json', 'Idempotency-Key':this.submissionKey },
        body: JSON.stringify({...payload,turnstileToken:this.turnstileToken})
      });
      if (!response.ok) {
        const code = await response.json().then((body: { error?: string }) => body.error).catch(() => '');
        throw new Error(this.submissionError(response.status, code));
      }
      const result = await response.json() as { ok?: boolean; reference?: string; stored?: boolean; notification?: string };
      if (!result.ok || !result.stored || typeof result.reference !== 'string' || !/^[0-9a-f-]{36}$/i.test(result.reference)) throw new Error('We could not confirm that your request was saved. Please retry; your answers are still here.');
      this.reference = result.stored && result.reference ? result.reference : '';
      this.notificationPending = result.notification === 'pending';
      this.submittedEmail = this.contactEmail.trim();
      this.sent = true;
      this.focusAfterRender('#consultation-confirmation');
      this.message = '';
    } catch (cause) {
      this.error = true;
      this.message = cause instanceof DOMException && (cause.name==='TimeoutError' || cause.name==='AbortError')
        ? 'The request timed out. It may have been saved. Please retry with the same details to confirm; your answers are still here.'
        : cause instanceof TypeError ? 'Connection lost. Your answers are still here. Check your internet connection and try again.'
        : cause instanceof SyntaxError ? 'We could not confirm that your request was saved. Please retry; your answers are still here.'
        : cause instanceof Error ? cause.message : 'Your request could not be confirmed. Please try again.';
      this.focusAfterRender('#submission-feedback');
    } finally {
      this.submitting = false;
      this.turnstileToken = '';
      if (!this.sent && this.widgetId && window.turnstile) window.turnstile.reset(this.widgetId);
    }
  }
}
