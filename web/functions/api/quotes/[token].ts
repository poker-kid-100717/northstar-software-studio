interface Env {
 INQUIRIES_DB?: {
   prepare(sql:string):{bind(...values:unknown[]):{first<T>():Promise<T|null>;run():Promise<{meta?:{changes?:number}}>}};
   batch(statements:unknown[]):Promise<Array<{meta?:{changes?:number}}>>;
 };
 QUOTE_ACCEPTANCE_ENABLED?:string;
}
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const reply=(data:object,status=200)=>Response.json(data,{status,headers});
type Quote={id:string;inquiry_id:string;service_name:string;deliverables:string;exclusions:string;currency:string;amount_cents:number;status:string;version:number;expires_at:string};
const digest=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(b=>b.toString(16).padStart(2,'0')).join('');
const validToken=(t:unknown):t is string=>typeof t==='string'&&/^[a-f0-9]{64}$/.test(t);
async function getQuote(env:Env,token:string):Promise<Quote|null>{
 const hash=await digest(token);
 return env.INQUIRIES_DB!.prepare("SELECT q.id,q.inquiry_id,q.service_name,q.deliverables,q.exclusions,q.currency,q.amount_cents,q.status,q.version,q.expires_at FROM service_quotes q JOIN quote_access_tokens t ON t.quote_id=q.id WHERE t.token_sha256=? AND t.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now') AND q.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')").bind(hash).first<Quote>();
}
const safeQuote=(q:Quote)=>({serviceName:q.service_name,deliverables:q.deliverables,exclusions:q.exclusions,currency:q.currency,amountCents:q.amount_cents,status:q.status,version:q.version,expiresAt:q.expires_at});
export const onRequestGet:PagesFunction<Env>=async({env,params})=>{
 const token=params['token'];
 if(!validToken(token))return reply({error:'NOT_FOUND'},404);
 if(!env.INQUIRIES_DB)return reply({error:'UNAVAILABLE'},503);
 try{
   const q=await getQuote(env,token);
   if(!q || !['sent','accepted'].includes(q.status))return reply({error:'NOT_FOUND'},404);
   return reply({quote:safeQuote(q),acceptanceEnabled:env.QUOTE_ACCEPTANCE_ENABLED==='true'});
 }catch{return reply({error:'UNAVAILABLE'},503);}
};
export const onRequestPost:PagesFunction<Env>=async({request,env,params})=>{
 if(env.QUOTE_ACCEPTANCE_ENABLED!=='true')return reply({error:'ACCEPTANCE_DISABLED'},503);
 if(!env.INQUIRIES_DB)return reply({error:'UNAVAILABLE'},503);
 if(request.headers.get('Origin')!==new URL(request.url).origin)return reply({error:'INVALID_ORIGIN'},403);
 if(!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))return reply({error:'INVALID_CONTENT_TYPE'},415);
 const token=params['token'];
 if(!validToken(token))return reply({error:'NOT_FOUND'},404);
 let body:unknown;
 try{const raw=await request.text();if(raw.length>512)return reply({error:'INVALID_BODY'},400);body=JSON.parse(raw);}catch{return reply({error:'INVALID_BODY'},400);}
 const input=body as {acceptTerms?:unknown;expectedVersion?:unknown}|null;
 if(!input||typeof input!=='object'||Array.isArray(input)||input.acceptTerms!==true||!Number.isSafeInteger(input.expectedVersion))return reply({error:'ACCEPTANCE_REQUIRED'},400);
 try{
   const q=await getQuote(env,token);
   if(!q)return reply({error:'NOT_FOUND'},404);
   if(q.status!=='sent'||q.version!==input.expectedVersion)return reply({error:'QUOTE_CONFLICT'},409);
   const db=env.INQUIRIES_DB!;
   const orderId=crypto.randomUUID(),eventId=crypto.randomUUID();
   const results=await db.batch([
     db.prepare("UPDATE service_quotes SET status='accepted',accepted_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),version=version+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND status='sent' AND version=? AND expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')").bind(q.id,q.version),
     db.prepare("INSERT INTO service_orders(id,quote_id,consult,currency,amount_cents) SELECT ?,?,1,?,? WHERE changes()=1").bind(orderId,q.id,q.currency,q.amount_cents),
     db.prepare("INSERT INTO commerce_events(id,entity_type,entity_id,event_type,old_status,new_status,actor,details_json) SELECT ?,'quote',?,'accepted','sent','accepted','customer',? WHERE changes()=1").bind(eventId,q.id,JSON.stringify({acceptedVersion:q.version,termsAccepted:true}))
   ]);
   if(results[0]?.meta?.changes!==1)return reply({error:'QUOTE_CONFLICT'},409);
   return reply({ok:true,status:'accepted',paymentStatus:'not_collected'});
 }catch{return reply({error:'ACCEPTANCE_UNAVAILABLE'},503);}
};
