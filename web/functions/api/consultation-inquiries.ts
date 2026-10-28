import { Env, digest, deliver, json as reply, readJson, validId } from '../_lib/inquiry';
const types = new Set(['software-repair','integration','automation','application','other']);
const budgets = new Set(['unsure','under-250','250-1000','1000-5000','5000-plus']);
const timelines = new Set(['flexible','this-week','2-4-weeks','later']);
const fail = (error: string, status: number) => reply({error}, status);
export const onRequestGet: PagesFunction<Env> = async ({env}) => reply({siteKey: env.TURNSTILE_SITE_KEY ?? null});
export const onRequestPost: PagesFunction<Env> = async ({request, env}) => {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return fail('ORIGIN_NOT_ALLOWED',403);
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return fail('INVALID_CONTENT_TYPE',415);
  let body: Record<string, unknown>;
  try { body = await readJson(request,12000); } catch { return fail('INVALID_PAYLOAD',400); }
  if (typeof body['website'] === 'string' && body['website'].trim()) return fail('INVALID_INQUIRY',400);
  const str = (key: string) => typeof body[key] === 'string' ? (body[key] as string).trim() : '';
  const name = str('name'), email = str('email').toLowerCase(), description = str('description');
  const projectType = str('projectType'), budget = str('budget'), timeline = str('timeline'), service = str('selectedService');
  const key = request.headers.get('Idempotency-Key') || crypto.randomUUID();
  if (!validId(key)) return fail('INVALID_IDEMPOTENCY_KEY',400);
  if (!name || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      description.length < 30 || description.length > 3000 || !types.has(projectType) || !budgets.has(budget) || !timelines.has(timeline) || service.length > 120)
    return fail('INVALID_INQUIRY',400);
  if (!env.INQUIRIES_DB) return fail('INQUIRY_STORAGE_UNAVAILABLE',503);
  if (!env.TURNSTILE_SECRET_KEY) return fail('VERIFICATION_UNAVAILABLE',503);
  const db = env.INQUIRIES_DB;
  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip) return fail('VERIFICATION_UNAVAILABLE',503);
  try {
    // Keyed hash, rotating hourly; never persist the raw IP or verification token.
    const hmac = await crypto.subtle.importKey('raw',new TextEncoder().encode(env.TURNSTILE_SECRET_KEY),{name:'HMAC',hash:'SHA-256'},false,['sign']);
    const bucket = Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',hmac,new TextEncoder().encode(Math.floor(Date.now()/3600000)+':'+ip))),b=>b.toString(16).padStart(2,'0')).join('');
    const count = await db.prepare('INSERT INTO inquiry_rate_limits(bucket,requests,expires_at) VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET requests = requests + 1 RETURNING requests')
      .bind(bucket,Math.floor(Date.now()/1000)+7200).first<{requests:number}>();
    await db.prepare('DELETE FROM inquiry_rate_limits WHERE expires_at < ?').bind(Math.floor(Date.now()/1000)).run();
    if (!count || count.requests > 10) return fail('RATE_LIMITED',429);
  } catch { return fail('INQUIRY_STORAGE_UNAVAILABLE',503); }
  const token = str('turnstileToken');
  if (!token || token.length > 2048) return fail('VERIFICATION_REQUIRED',400);
  try {
    const form = new FormData(); form.set('secret',env.TURNSTILE_SECRET_KEY); form.set('response',token); form.set('remoteip',ip);
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:form,signal:AbortSignal.timeout(8000)});
    if (!response.ok) return fail('VERIFICATION_UNAVAILABLE',503);
    const result = await response.json() as {success?:boolean;hostname?:string};
    if (!result.success || result.hostname !== new URL(request.url).hostname) return fail('VERIFICATION_FAILED',403);
  } catch { return fail('VERIFICATION_UNAVAILABLE',503); }
  const hash = await digest(JSON.stringify([name,email,projectType,description,budget,timeline,service]));
  let saved: {id:string;request_hash:string;notification_status:string} | null;
  try {
    const result = await db.prepare('INSERT INTO consultation_inquiries(id,contact_name,contact_email,project_type,description,budget,timeline,selected_service,source,idempotency_key,request_hash) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING')
      .bind(crypto.randomUUID(),name,email,projectType,description,budget,timeline,service,'consultation',key,hash).run();
    if (!result.success) return fail('INQUIRY_STORAGE_UNAVAILABLE',503);
    saved = await db.prepare('SELECT id,request_hash,notification_status FROM consultation_inquiries WHERE idempotency_key = ?').bind(key).first();
    if (!saved) return fail('INQUIRY_STORAGE_UNAVAILABLE',503);
    if (saved.request_hash !== hash) return fail('IDEMPOTENCY_CONFLICT',409);
  } catch { return fail('INQUIRY_STORAGE_UNAVAILABLE',503); }
  let notification = saved.notification_status === 'sent' ? 'sent' : 'pending';
  try { if (notification !== 'sent') notification = await deliver(env,saved.id); } catch { /* Durable outbox remains retryable. */ }
  return reply({ok:true,stored:true,reference:saved.id,notification});
};
