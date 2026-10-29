import { authorize } from '../admin/inquiries';
import type { Env as AdminEnv } from '../../_lib/inquiry';

type Env = AdminEnv & { STRIPE_SECRET_KEY?: string; STRIPE_CHECKOUT_TEST_ENABLED?: string };
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const json = (value: object, status=200) => Response.json(value,{status,headers});
interface LocalOrder {
 id: string; status: string; amount_cents: number; currency: string;
 provider_checkout_session_id: string; provider_payment_intent_id: string | null;
}
interface StripeSession {
 id?: string; livemode?: boolean; payment_status?: string; amount_total?: number;
 currency?: string; payment_intent?: string | null; client_reference_id?: string;
}
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
 const denied = await authorize(request,env);
 if (denied) return denied;
 // Read-only, test-mode only. This endpoint must never create/refund/modify Stripe payments.
 if (env.STRIPE_CHECKOUT_TEST_ENABLED !== 'true' || !env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
  return json({error:'STRIPE_TEST_RECONCILIATION_DISABLED'},503);
 }
 const url=new URL(request.url);
 const rawLimit=url.searchParams.get('limit') ?? '10';
 const orderId=url.searchParams.get('orderId');
 if(orderId!==null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId))return json({error:'INVALID_ORDER_ID'},400);
 if (!/^(?:[1-9]|10)$/.test(rawLimit)) return json({error:'INVALID_LIMIT'},400);
 try {
  const orders=await env.INQUIRIES_DB!.prepare(
   "SELECT id,status,amount_cents,currency,provider_checkout_session_id,provider_payment_intent_id FROM service_orders WHERE provider_checkout_session_id IS NOT NULL AND (? IS NULL OR id=?) ORDER BY created_at DESC LIMIT ?"
  ).bind(orderId,orderId,Number(rawLimit)).all<LocalOrder>();
  const results: Array<{orderId:string; localStatus:string; finding:string; }> = [];
  for(const order of orders.results) {
   // Refuse malformed identifiers before using them in a provider URL.
   if(!/^cs_test_[A-Za-z0-9_]+$/.test(order.provider_checkout_session_id)) {
    results.push({orderId:order.id,localStatus:order.status,finding:'INVALID_LOCAL_SESSION_ID'});
    continue;
   }
   const response=await fetch('https://api.stripe.com/v1/checkout/sessions/'+encodeURIComponent(order.provider_checkout_session_id),{
    headers:{Authorization:'Bearer '+env.STRIPE_SECRET_KEY},signal:AbortSignal.timeout(8000)
   });
   if(!response.ok) {
    results.push({orderId:order.id,localStatus:order.status,finding:'PROVIDER_LOOKUP_FAILED'});
    continue;
   }
   const session=await response.json() as StripeSession;
   const matches=session.id===order.provider_checkout_session_id && session.livemode===false &&
     session.client_reference_id===order.id && session.currency===order.currency &&
     session.amount_total===order.amount_cents &&
     (!order.provider_payment_intent_id || session.payment_intent===order.provider_payment_intent_id);
   let finding='MATCH';
   if(!matches) finding='PROVIDER_MISMATCH';
   else if(session.payment_status==='paid' && order.status==='awaiting_payment') finding='MISSING_PAID_TRANSITION';
   else if(session.payment_status!=='paid' && ['paid','in_progress','delivered','revision','completed'].includes(order.status)) finding='LOCAL_PAID_WITHOUT_PROVIDER_CONFIRMATION';
   else if(!['paid','unpaid','no_payment_required'].includes(session.payment_status??'')) finding='UNRECOGNIZED_PROVIDER_STATUS';
   results.push({orderId:order.id,localStatus:order.status,finding});
  }
  return json({mode:'test',checked:results.length,results,caveat:'Read-only Checkout Session comparison; refunds, charges, balance transactions and webhook event gaps require separate reconciliation.'});
 } catch {
  return json({error:'RECONCILIATION_UNAVAILABLE'},503);
 }
};
