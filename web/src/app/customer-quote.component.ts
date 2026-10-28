import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

interface Quote { serviceName:string; deliverables:string; exclusions:string; currency:string; amountCents:number; status:string; version:number; expiresAt:string }
@Component({
  standalone:true,
  imports:[CommonModule,FormsModule],
  template:`
    <section class="page ns-admin">
      <p class="eyebrow">NORTHSTAR / PRIVATE QUOTE</p>
      <h1>Review your service quote</h1>
      <p class="lead">Review the scope and price before deciding whether to accept. No payment is collected on this page.</p>
      @if (loading) { <p role="status">Loading quote…</p> }
      @if (error) { <div role="alert" class="ns-admin-error"><strong>Quote unavailable</strong><p>{{error}}</p></div> }
      @if (quote && !loading) {
        <article class="ns-admin-detail">
          <h2>{{quote.serviceName}}</h2>
          <dl>
            <div><dt>Total price</dt><dd>{{quote.amountCents / 100 | currency:'USD':'symbol':'1.2-2'}}</dd></div>
            <div><dt>Valid until</dt><dd>{{quote.expiresAt | date:'medium'}}</dd></div>
            <div><dt>Status</dt><dd>{{quote.status}}</dd></div>
          </dl>
          <h3>Included deliverables</h3><p class="ns-admin-description">{{quote.deliverables}}</p>
          <h3>Exclusions</h3><p class="ns-admin-description">{{quote.exclusions || 'No additional exclusions specified.'}}</p>
          @if (quote.status === 'sent' && enabled && !accepted) {
            <label><input type="checkbox" [(ngModel)]="consent"> I have reviewed this quote, its deliverables, exclusions, price, and expiration, and I agree to accept these terms.</label>
            <button type="button" class="button primary" [disabled]="!consent || saving" (click)="accept()">{{saving ? 'Submitting…' : 'Accept quote (no payment)'}}</button>
          } @else if (accepted || quote.status === 'accepted') {
            <p role="status">Quote accepted. No payment has been collected. Northstar will follow up with next steps.</p>
          } @else {
            <p class="muted">Online acceptance is not currently available. Contact Northstar to proceed.</p>
          }
          @if (acceptError) { <p role="alert" class="ns-admin-error">{{acceptError}}</p> }
        </article>
      }
    </section>
  `
})
export class CustomerQuoteComponent implements OnInit {
  quote:Quote|null=null; loading=true; saving=false; enabled=false; consent=false; accepted=false; error=''; acceptError='';
  private token='';
  constructor(private readonly route:ActivatedRoute){}
  ngOnInit():void { this.token=this.route.snapshot.paramMap.get('token')??''; void this.load(); }
  async load():Promise<void> {
    if(!/^[a-f0-9]{64}$/.test(this.token)){this.error='The quote link is invalid or expired.';this.loading=false;return;}
    try {
      const response=await fetch('/api/quotes/'+encodeURIComponent(this.token),{cache:'no-store',credentials:'omit',redirect:'error'});
      if(!response.ok)throw new Error(response.status===404?'This quote link is invalid, expired, or no longer available.':'Unable to load this quote right now.');
      const body=await response.json() as {quote:Quote;acceptanceEnabled:boolean};
      this.quote=body.quote;this.enabled=body.acceptanceEnabled;
    }catch(e){this.error=e instanceof Error?e.message:'Unable to load quote.';}
    finally{this.loading=false;}
  }
  async accept():Promise<void> {
    if(!this.quote || this.quote.status!=='sent' || !this.enabled || !this.consent || this.saving)return;
    this.saving=true;this.acceptError='';
    try {
      const response=await fetch('/api/quotes/'+encodeURIComponent(this.token),{method:'POST',credentials:'omit',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify({acceptTerms:true,expectedVersion:this.quote.version})});
      if(!response.ok)throw new Error(response.status===409?'This quote has changed or has already been accepted. Reload the link before continuing.':'We could not record acceptance. Please contact Northstar.');
      this.accepted=true;this.quote={...this.quote,status:'accepted'};
    }catch(e){this.acceptError=e instanceof Error?e.message:'Acceptance failed.';}
    finally{this.saving=false;}
  }
}
