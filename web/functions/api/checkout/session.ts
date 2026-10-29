// Stripe test-only Checkout for accepted, unpaid customer quotes.
// Payment state MUST be set only by a separately verified Stripe webhook.
interface Db {
  prepare(sql:string):{bind(...params:unknown[]):{first<T>():Promise<T|null>;run():Promise<{meta?:{changes?:number}}>}};
}
interface Env { INQUIRIES_DB?:Db; STRIPE_SECRET_KEY?:string; STRIPE_CHECKOUT_TEST_ENABLED?:string; QUOTE_ACCEPTANCE_ENABLED?:string }
const reply=(body:object,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
const sha256=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(b=>b.toString(16).padStart(2,'0')).join('');
interface Order {id:string; quote_id:string; status:string; amount_cents:number; currency:string; service_name:string; provider_checkout_session_id:string|null}
export const onRequestPost:PagesFunction<Env>=async({request,env})=>{
  // Never enable live charges through this endpoint.
  if(env.STRIPE_CHECKOUT_TEST_ENABLED!=='true'||env.QUOTE_ACCEPTANCE_ENABLED!=='true')return reply({error:'CHECKOUT_DISABLED'},503);
  if(!env.STRIPE_SECRET_KEY?.startsWith('sk_test_')||!env.INQUIRIES_DB)return reply({error:'CHECKOUT_NOT_CONFIGURED'},503);
  if(request.headers.get('Origin')!==new URL(request.url).origin)return reply({error:'INVALID_ORIGIN'},403);
  if(!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))return reply({error:'INVALID_CONTENT_TYPE'},415);
  let input:unknown;
  try{const raw=await request.text();if(raw.length>256)return reply({error:'INVALID_REQUEST'},400);input=JSON.parse(raw);}catch{return reply({error:'INVALID_REQUEST'},400);}
  if(!input||typeof input!=='object'||Array.isArray(input))return reply({error:'INVALID_REQUEST'},400);
  const data=input as Record<string,unknown>;
  const token=data['token'];
  if(Object.keys(data).some(k=>k!=='token')||typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))return reply({error:'INVALID_REQUEST'},400);
  try {
    const hash=await sha256(token);
    // The browser supplies only an opaque access token; never a price or order ID.
    const order=await env.INQUIRIES_DB.prepare(
      "SELECT o.id,o.quote_id,o.status,o.amount_cents,o.currency,q.service_name,o.provider_checkout_session_id FROM service_orders o JOIN service_quotes q ON q.id=o.quote_id JOIN quote_access_tokens t ON t.quote_id=q.id WHERE t.token_sha256=? AND t.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now') AND q.status='accepted' AND q.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')"
    ).bind(hash).first<Order>();
    if(!order)return reply({error:'ORDER_NOT_FOUND'},404);
    if(order.status!=='awaiting_payment'||order.currency!=='usd'||!Number.isSafeInteger(order.amount_cents)||order.amount_cents<1)return reply({error:'ORDER_NOT_ELIGIBLE'},409);
    // Refuse duplicate session creation; a follow-up endpoint can safely restore an existing session.
    if(order.provider_checkout_session_id)return reply({error:'CHECKOUT_ALREADY_STARTED'},409);
    const origin=new URL(request.url).origin;
    const params=new URLSearchParams({
      mode:'payment',
      success_url:origin+'/checkout/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url:origin+'/quote/'+token,
      'line_items[0][price_data][currency]':'usd',
      'line_items[0][price_data][unit_amount]':String(order.amount_cents),
      'line_items[0][price_data][product_data][name]':order.service_name.slice(0,120),
      'line_items[0][quantity]':'1',
      'metadata[order_id]':order.id,
      'client_reference_id':order.id
    });
    const stripe=await fetch('https://api.stripe.com/v1/checkout/sessions',{
      method:'POST',headers:{'Authorization':'Bearer '+env.STRIPE_SECRET_KEY,'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':'northstar-test-checkout-'+order.id},
      body:params,signal:AbortSignal.timeout(10000)
    });
    if(!stripe.ok)return reply({error:'CHECKOUT_PROVIDER_UNAVAILABLE'},502);
    const session=await stripe.json() as {id?:string;url?:string;livemode?:boolean};
    if(!session.id?.startsWith('cs_test_')||session.livemode!==false||!session.url?.startsWith('https://checkout.stripe.com/'))return reply({error:'CHECKOUT_PROVIDER_INVALID'},502);
    const stored=await env.INQUIRIES_DB.prepare(
      "UPDATE service_orders SET payment_provider='stripe',provider_checkout_session_id=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND status='awaiting_payment' AND provider_checkout_session_id IS NULL"
    ).bind(session.id,order.id).run();
    if(stored.meta?.changes!==1)return reply({error:'CHECKOUT_CONFLICT'},409);
    return reply({checkoutUrl:session.url,orderId:order.id,mode:'test',paymentStatus:'awaiting_payment'});
  }catch{return reply({error:'CHECKOUT_UNAVAILABLE'},503);}
};
