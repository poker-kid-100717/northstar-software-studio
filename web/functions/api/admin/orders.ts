// Owner-only, read-only fulfillment queue. Never changes payment or delivery state.
import { authorize } from './inquiries';
type Env = Parameters<typeof authorize>[1];
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const respond = (data: object, status=200) => Response.json(data,{status,headers});
const statuses = new Set(['all','awaiting_payment','paid','in_progress','delivered','revision','completed','cancelled','refunded']);
interface OrderSummary {
 id:string; quote_id:string; status:string; consult:number; amount_cents:number;
 currency:string; payment_provider:string|null; paid_at:string|null; completed_at:string|null;
 created_at:string; updated_at:string; service_name:string; inquiry_id:string;
}
export const onRequestGet: PagesFunction<Env> = async ({request,env}) => {
 const denied=await authorize(request,env);
 if(denied)return denied;
 const url=new URL(request.url);
 // Only documented filters. This endpoint never accepts arbitrary SQL fragments.
 let invalidQuery=false;
 url.searchParams.forEach((_,key)=>{
  if(!['status','limit','offset'].includes(key) || url.searchParams.getAll(key).length!==1)invalidQuery=true;
 });
 if(invalidQuery)return respond({error:'INVALID_QUERY'},400);
 const status=url.searchParams.get('status') ?? 'all';
 if(!statuses.has(status))return respond({error:'INVALID_STATUS'},400);
 const limitText=url.searchParams.get('limit') ?? '25';
 const offsetText=url.searchParams.get('offset') ?? '0';
 if(!/^(?:[1-9]|[1-4][0-9]|50)$/.test(limitText) ||
    !/^(?:0|[1-9][0-9]{0,4})$/.test(offsetText) ||
    Number(offsetText)>10000)return respond({error:'INVALID_PAGE'},400);
 const limit=Number(limitText),offset=Number(offsetText);
 try {
  const db=env.INQUIRIES_DB!;
  const where=" WHERE (? = 'all' OR o.status = ?)";
  const data=await db.prepare(
   'SELECT o.id,o.quote_id,o.status,o.consult,o.amount_cents,o.currency,o.payment_provider,'+
   'o.paid_at,o.completed_at,o.created_at,o.updated_at,q.service_name,q.inquiry_id '+
   'FROM service_orders o INNER JOIN service_quotes q ON q.id=o.quote_id'+where+
   ' ORDER BY o.created_at DESC,o.id DESC LIMIT ? OFFSET ?'
  ).bind(status,status,limit,offset).all<OrderSummary>();
  const total=await db.prepare('SELECT COUNT(*) AS n FROM service_orders o'+where)
   .bind(status,status).first<{n:number}>();
  const summary=await db.prepare('SELECT status,COUNT(*) AS count FROM service_orders GROUP BY status')
   .all<{status:string;count:number}>();
  return respond({orders:data.results,total:total?.n??0,limit,offset,status,
   counts:summary.results});
 }catch{return respond({error:'ORDERS_UNAVAILABLE'},503);}
};
