import { Component, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
interface Activity { id:string; kind:'note'|'status'; body:string|null; old_status:string|null; new_status:string|null; actor:string; created_at:string }
interface Quote { id:string; service_name:string; deliverables:string; exclusions:string; amount_cents:number; status:string; version:number; expires_at:string|null }
interface Inquiry { id:string; created_at:string; contact_name:string; contact_email:string; project_type:string; description:string; budget:string; timeline:string; status:string; notification_status:string }
@Component({
 standalone:true, imports:[DatePipe,DecimalPipe,FormsModule],
 template:`
 <section class="page ns-admin">
   <p class="eyebrow">NORTHSTAR / PRIVATE WORKSPACE</p>
   <h1>Inquiry management</h1>
   <p class="lead">Review new opportunities, understand what customers need, and keep every conversation organized.</p>
   <div class="ns-admin-toolbar" aria-label="Admin session">
     @if (authenticated) { <p class="muted" role="status">Signed in · Role: Admin (owner)</p> }
     <a class="button secondary" href="/cdn-cgi/access/logout">Sign out</a>
   </div>
   <div class="ns-admin-toolbar">
     <label>Search inquiries <input [(ngModel)]="search" placeholder="Name, email, project, or reference" aria-label="Search inquiries"></label>
     <label>Status <select [(ngModel)]="status" (ngModelChange)="load()">
       <option value="all">All statuses</option>
       @for (s of statuses; track s) { <option [value]="s">{{s}}</option> }
     </select></label>
     <button type="button" class="button secondary" (click)="load()" [disabled]="loading">Refresh</button>
   </div>
   @if (needsLogin) { <div class="ns-admin-error" role="alert"><strong>Sign in to manage inquiries</strong><p>Cloudflare Access needs an authenticated session before the dashboard can retrieve private customer records.</p><a class="button primary" href="/api/admin/inquiries" target="_blank" rel="noopener noreferrer">Authenticate inquiry API (new tab)</a><p class="fineprint">Cloudflare Access protects the inquiry API separately. Sign in in the new tab, then return to this dashboard and click Refresh. If the new tab shows JSON, authentication succeeded; close that tab without sharing its contents.</p></div> }
   @if (loading) { <p role="status">Loading your inquiries…</p> }
   @if (error) { <div class="ns-admin-error" role="alert"><strong>Unable to load inquiries.</strong><p>{{error}}</p><button class="button secondary" (click)="load()">Try again</button></div> }
   @if (!loading && !error) {
     <p class="muted" role="status">{{filtered.length | number}} shown · Up to {{limit}} most recent records for the selected status</p>
     @if (!filtered.length) { <div class="ns-admin-empty"><h2>No matching inquiries</h2><p>Try another search or status. New customer requests will appear here after they are saved.</p></div> }
     <div class="ns-admin-grid">
       <div class="ns-admin-list" aria-label="Inquiries">
         @for (inquiry of filtered; track inquiry.id) {
           <button type="button" class="ns-admin-item" [class.active]="selected?.id===inquiry.id" (click)="selectInquiry(inquiry)" [attr.aria-pressed]="selected?.id===inquiry.id">
             <span class="ns-admin-item-head"><strong>{{inquiry.contact_name}}</strong><span class="ns-admin-status">{{inquiry.status}}</span></span>
             <span>{{inquiry.project_type}} · {{inquiry.created_at | date:'mediumDate'}}</span>
             <small>{{inquiry.contact_email}}</small>
           </button>
         }
       </div>
       @if (selected) {
         <article class="ns-admin-detail">
           <p class="eyebrow">INQUIRY DETAILS</p>
           <h2>{{selected.contact_name}}</h2>
           <p><a [href]="'mailto:'+selected.contact_email">{{selected.contact_email}}</a></p>
           <dl>
             <div><dt>Received</dt><dd>{{selected.created_at | date:'medium'}}</dd></div>
             <div><dt>Status</dt><dd><label for="inquiry-status">Update status</label><select id="inquiry-status" [ngModel]="selected.status" (ngModelChange)="changeStatus($event)" [disabled]="savingStatus">@for (s of statuses; track s) { <option [value]="s">{{s}}</option> }</select></dd></div>
             <div><dt>Email notification</dt><dd>{{selected.notification_status}}</dd></div>
             <div><dt>Project type</dt><dd>{{selected.project_type}}</dd></div>
             <div><dt>Budget</dt><dd>{{selected.budget}}</dd></div>
             <div><dt>Timeline</dt><dd>{{selected.timeline}}</dd></div>
           </dl>
           @if (savingStatus) { <p role="status">Saving status…</p> }
           @if (statusError) { <p role="alert" class="ns-admin-error">{{statusError}}</p> }
           @if (statusSaved) { <p role="status">Status saved.</p> }
           <section class="ns-admin-activity" aria-label="Service quotes">
             <h3>Service quotes</h3>
             <p class="muted">Draft and approve scope before sending any customer payment request. Approving does not charge a customer.</p>
             @if (quotesError) { <p role="alert" class="ns-admin-error">{{quotesError}}</p> }
             @if (quotesLoading) { <p role="status">Loading quotes…</p> }
             @for (quote of quotes; track quote.id) {
               <article>
                 <strong>{{quote.service_name}} · {{quote.status}}</strong>
                 <p>{{quote.deliverables}}</p>
                 <p>USD {{quote.amount_cents / 100 | number:'1.2-2'}} · Version {{quote.version}}</p>
                 @if (quote.status === 'draft') {
                   <button type="button" class="button secondary" [disabled]="savingQuote" (click)="approveQuote(quote)">Approve quote (no payment)</button>
                 }
               </article>
             }
             <form (submit)="createQuote($event)">
               <label>Service name <input name="quoteName" [(ngModel)]="quoteName" maxlength="120" required></label>
               <label>Deliverables <textarea name="quoteDeliverables" [(ngModel)]="quoteDeliverables" maxlength="4000" required rows="3"></textarea></label>
               <label>Exclusions <textarea name="quoteExclusions" [(ngModel)]="quoteExclusions" maxlength="4000" rows="2"></textarea></label>
               <label>Quoted amount in USD <input name="quoteAmount" [(ngModel)]="quoteAmount" type="number" min="0.01" max="1000000" step="0.01" required></label>
               <button type="submit" class="button secondary" [disabled]="savingQuote || !quoteName.trim() || !quoteDeliverables.trim()">{{savingQuote ? 'Saving…' : 'Save draft quote'}}</button>
             </form>
           </section>
           <h3>What the customer needs</h3>
           <p class="ns-admin-description">{{selected.description}}</p>
           <p class="muted">Reference: {{selected.id}}</p>
           <a class="button primary" [href]="'mailto:'+selected.contact_email+'?subject='+encodeSubject(selected.id)">Reply by email</a>
           <section aria-label="Private activity" class="ns-admin-activity">
             <h3>Private notes and activity</h3>
             <label for="inquiry-note">Add an internal note</label>
             <textarea id="inquiry-note" [(ngModel)]="noteDraft" maxlength="2000" rows="3" placeholder="Record next steps, context, or a customer conversation"></textarea>
             <button type="button" class="button secondary" (click)="addNote()" [disabled]="savingNote || !noteDraft.trim()"> {{savingNote ? 'Saving…' : 'Save private note'}} </button>
             @if (activityError) { <p role="alert">{{activityError}}</p> }
             @if (activityLoading) { <p role="status">Loading activity…</p> }
             @if (!activityLoading && !activity.length) { <p class="muted">No activity recorded yet.</p> }
             <ol>
               @for (event of activity; track event.id) {
                 <li><small>{{event.created_at | date:'medium'}} · {{event.actor}}</small>
                   @if (event.kind === 'note') { <p class="ns-admin-description">{{event.body}}</p> }
                   @else { <p>Status: {{event.old_status}} → {{event.new_status}}</p> }
                 </li>
               }
             </ol>
           </section>
         </article>
       }
     </div>
   }
 </section>`
})
export class AdminInquiriesComponent implements OnInit {
 inquiries:Inquiry[]=[]; selected:Inquiry|null=null; authenticated=false; loading=false; error=''; needsLogin=false; search=''; status='all'; limit=50; savingStatus=false; statusError=''; statusSaved=false; activity:Activity[]=[]; activityLoading=false; activityError=''; noteDraft=''; savingNote=false;
 quotes:Quote[]=[]; quotesError=''; quotesLoading=false; savingQuote=false; quoteName=''; quoteDeliverables=''; quoteExclusions=''; quoteAmount=100;
 readonly statuses=['new','reviewing','contacted','qualified','quoted','won','lost','archived'];
 get filtered():Inquiry[] { const q=this.search.trim().toLowerCase(); return this.inquiries.filter(i=>!q || [i.contact_name,i.contact_email,i.project_type,i.description,i.id].some(x=>x.toLowerCase().includes(q))); }
 encodeSubject(id:string):string { return encodeURIComponent('Northstar inquiry '+id); }
 async changeStatus(next:string):Promise<void> {
   const item=this.selected;
   if(!item || this.savingStatus || !this.statuses.includes(next) || item.status===next) return;
   this.savingStatus=true;this.statusError='';this.statusSaved=false;
   try {
     const response=await fetch('/api/admin/inquiries/'+encodeURIComponent(item.id)+'/status',{
       method:'PATCH',headers:{'Content-Type':'application/json'},credentials:'same-origin',cache:'no-store',body:JSON.stringify({status:next})
     });
     if(!response.ok || response.redirected) throw new Error(response.status===401||response.status===403?'Your admin session expired. Sign in again.':'Unable to save status. Please retry.');
     item.status=next;
     this.statusSaved=true;
     if(this.status!=='all' && this.status!==next) { this.inquiries=this.inquiries.filter(i=>i.id!==item.id); this.selected=this.inquiries[0]??null; }
   } catch(e) { this.statusError=e instanceof Error?e.message:'Unable to save status.'; }
   finally {this.savingStatus=false;}
 }
 selectInquiry(inquiry:Inquiry):void { this.selected=inquiry;this.noteDraft='';void this.loadActivity();void this.loadQuotes(); }
 async loadActivity():Promise<void> {
   const id=this.selected?.id;
   this.activity=[];this.activityError='';if(!id)return;
   this.activityLoading=true;
   try {
     const response=await fetch('/api/admin/inquiries/'+encodeURIComponent(id)+'/activity',{credentials:'same-origin',cache:'no-store'});
     if(!response.ok || response.redirected) throw new Error('Unable to load private activity. Check that D1 migration 0002 is applied.');
     const data=await response.json() as {activity:Activity[]};
     if(this.selected?.id===id) this.activity=data.activity;
   } catch(e) { if(this.selected?.id===id) this.activityError=e instanceof Error?e.message:'Activity unavailable'; }
   finally { if(this.selected?.id===id)this.activityLoading=false; }
 }
 async addNote():Promise<void> {
   const id=this.selected?.id, body=this.noteDraft.trim();
   if(!id || !body || body.length>2000 || this.savingNote)return;
   this.savingNote=true;this.activityError='';
   try {
     const response=await fetch('/api/admin/inquiries/'+encodeURIComponent(id)+'/activity',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({body})});
     if(!response.ok || response.redirected) throw new Error('Could not save note. Please retry.');
     if(this.selected?.id===id){this.noteDraft='';await this.loadActivity();}
   } catch(e){this.activityError=e instanceof Error?e.message:'Could not save note';}
   finally{this.savingNote=false;}
 }
 async loadQuotes():Promise<void> {
   const id=this.selected?.id;
   this.quotes=[];this.quotesError='';
   if(!id)return;
   this.quotesLoading=true;
   try {
     const response=await fetch('/api/admin/quotes?inquiryId='+encodeURIComponent(id),{credentials:'same-origin',cache:'no-store'});
     if(!response.ok || response.redirected) throw new Error('Could not load quotes. Verify admin API access and commerce migration 0003.');
     const data=await response.json() as {quotes:Quote[]};
     if(this.selected?.id===id)this.quotes=data.quotes??[];
   } catch(e){if(this.selected?.id===id)this.quotesError=e instanceof Error?e.message:'Quote list unavailable';}
   finally{if(this.selected?.id===id)this.quotesLoading=false;}
 }
 async createQuote(event:Event):Promise<void> {
   event.preventDefault();
   const id=this.selected?.id;
   if(!id || this.savingQuote)return;
   const cents=Math.round(Number(this.quoteAmount)*100);
   if(!Number.isSafeInteger(cents)||cents<1||cents>100000000||!this.quoteName.trim()||!this.quoteDeliverables.trim()){this.quotesError='Check quote fields and amount.';return;}
   this.savingQuote=true;this.quotesError='';
   try {
     const response=await fetch('/api/admin/quotes',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({inquiryId:id,serviceName:this.quoteName.trim(),deliverables:this.quoteDeliverables.trim(),exclusions:this.quoteExclusions.trim(),amountCents:cents})});
     if(!response.ok || response.redirected)throw new Error('Quote could not be saved (HTTP '+response.status+').');
     this.quoteName='';this.quoteDeliverables='';this.quoteExclusions='';await this.loadQuotes();
   } catch(e){this.quotesError=e instanceof Error?e.message:'Quote unavailable';}
   finally{this.savingQuote=false;}
 }
 async approveQuote(quote:Quote):Promise<void> {
   if(this.savingQuote || quote.status!=='draft')return;
   const expiry=new Date(Date.now()+14*86400000).toISOString();
   this.savingQuote=true;this.quotesError='';
   try {
     const response=await fetch('/api/admin/quotes/'+encodeURIComponent(quote.id)+'/approve',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedVersion:quote.version,expiresAt:expiry})});
     if(!response.ok || response.redirected)throw new Error(response.status===409?'Quote changed; reload before approving.':'Quote approval failed (HTTP '+response.status+').');
     await this.loadQuotes();
   }catch(e){this.quotesError=e instanceof Error?e.message:'Approval unavailable';}
   finally{this.savingQuote=false;}
 }
 ngOnInit():void { void this.load(); }
 async load():Promise<void> {
   this.loading=true;this.error='';this.needsLogin=false;this.authenticated=false;this.statusError='';this.statusSaved=false;
   try {
     const response=await fetch('/api/admin/inquiries?status='+encodeURIComponent(this.status)+'&limit='+this.limit,{cache:'no-store',credentials:'same-origin'});
     if(response.redirected || response.url.includes('/cdn-cgi/access/login') || response.status===401 || response.status===403) { this.needsLogin=true; throw new Error('Your Cloudflare Access session needs to be established or renewed. Authenticate the inquiry API in a new tab, then retry.'); }
     if(!response.ok) throw new Error(response.status===401||response.status===403?'Your admin session is not authorized. Sign in through Cloudflare Access and try again.':response.status===503?'The admin API is not fully configured yet. Check Cloudflare Access settings and D1 binding.':'The server returned HTTP '+response.status+'.');
     const data=await response.json() as {inquiries?:Inquiry[]};
     this.inquiries=data.inquiries??[];
     this.authenticated=true;
     const previous=this.selected?.id;
     this.selected=this.inquiries.find(i=>i.id===previous)??this.inquiries[0]??null;
     if(this.selected?.id!==previous) { this.noteDraft='';void this.loadActivity();void this.loadQuotes(); }
   } catch(e) { if(e instanceof TypeError) { this.needsLogin=true; this.error='The secure login was redirected outside the application. Authenticate the inquiry API in a new tab, then return here and refresh.'; } else { this.error=e instanceof Error?e.message:'An unexpected error occurred.'; } }
   finally {this.loading=false;}
 }
}
