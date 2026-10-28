import { authorize } from '../../inquiries';
type Env = Parameters<typeof authorize>[1];
const response = (data: object, status = 200) => Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
const idPattern = /^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i;
const hash = async (token:string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(b=>b.toString(16).padStart(2,'0')).join('');
export const onRequestPost: PagesFunction<Env> = async ({request,env,params}) => {
  const denied = await authorize(request,env);
  if(denied)return denied;
  if(request.headers.get('Origin') !== new URL(request.url).origin)return response({error:'INVALID_ORIGIN'},403);
  const id=params['id'];
  if(typeof id!=='string'||!idPattern.test(id))return response({error:'INVALID_QUOTE_ID'},400);
  try {
    const db=env.INQUIRIES_DB!;
    const quote=await db.prepare("SELECT status,expires_at FROM service_quotes WHERE id=?").bind(id).first<{status:string;expires_at:string|null}>();
    if(!quote)return response({error:'NOT_FOUND'},404);
    if(quote.status!=='approved' || !quote.expires_at || Date.parse(quote.expires_at)<=Date.now())return response({error:'QUOTE_NOT_SHAREABLE'},409);
    const bytes=crypto.getRandomValues(new Uint8Array(32));
    const token=Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');
    const tokenHash=await hash(token);
    const dbBatch=db as typeof db & {batch(statements:unknown[]):Promise<Array<{meta?:{changes?:number}}>>};
    const results=await dbBatch.batch([
      db.prepare("UPDATE service_quotes SET status='sent',version=version+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND status='approved' AND expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')").bind(id),
      db.prepare("INSERT INTO quote_access_tokens(quote_id,token_sha256,expires_at) SELECT ?,?,? WHERE changes()=1").bind(id,tokenHash,quote.expires_at),
      db.prepare("INSERT INTO commerce_events(id,entity_type,entity_id,event_type,old_status,new_status,actor) SELECT ?,'quote',?,'shared','approved','sent',? WHERE changes()=1").bind(crypto.randomUUID(),id,env.CF_ACCESS_ADMIN_EMAIL!)
    ]);
    if(results[0]?.meta?.changes!==1)return response({error:'QUOTE_CONFLICT'},409);
    return response({ok:true,shareUrl:new URL('/quote/'+token,new URL(request.url).origin).toString(),expiresAt:quote.expires_at});
  }catch{return response({error:'SHARE_UNAVAILABLE'},503);}
};
