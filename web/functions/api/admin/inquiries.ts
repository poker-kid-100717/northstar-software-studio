import { Env } from '../../_lib/inquiry';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const deny = (status: number) => Response.json({ error: status === 503 ? 'ADMIN_NOT_CONFIGURED' : 'NOT_AUTHORIZED' }, { status, headers });
function decode64(input: string): Uint8Array<ArrayBuffer> {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const bytes = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '='));
  return Uint8Array.from(bytes, c => c.charCodeAt(0));
}
export async function authorize(request: Request, env: Env): Promise<Response | null> {
  if (!env.CF_ACCESS_TEAM_DOMAIN || !env.CF_ACCESS_AUD || !env.CF_ACCESS_ADMIN_EMAIL || !env.INQUIRIES_DB) return deny(503);
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return deny(401);
  if (token.length > 16384) return deny(403);
  const domain = env.CF_ACCESS_TEAM_DOMAIN.replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(domain)) return deny(503);
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return deny(401);
    const header = JSON.parse(new TextDecoder().decode(decode64(parts[0]))) as { alg?: string; kid?: string };
    const claims = JSON.parse(new TextDecoder().decode(decode64(parts[1]))) as { iss?: string; aud?: string[] | string; exp?: number; nbf?: number; email?: string };
    if (header.alg !== 'RS256' || !header.kid || typeof claims.exp !== 'number' || !Number.isFinite(claims.exp) || claims.exp <= Date.now()/1000 ||
        (claims.nbf !== undefined && (typeof claims.nbf !== 'number' || !Number.isFinite(claims.nbf) || claims.nbf > Date.now()/1000)) ||
        claims.iss !== 'https://' + domain ||
        !(Array.isArray(claims.aud) ? claims.aud.includes(env.CF_ACCESS_AUD) : claims.aud === env.CF_ACCESS_AUD) ||
        claims.email?.toLowerCase() !== env.CF_ACCESS_ADMIN_EMAIL.toLowerCase()) return deny(403);
    const response = await fetch('https://' + domain + '/cdn-cgi/access/certs', { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return deny(503);
    const keys = await response.json() as { keys?: Array<JsonWebKey & { kid?: string }> };
    const jwk = keys.keys?.find(k => k.kid === header.kid && k.kty === 'RSA');
    if (!jwk) return deny(403);
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const data = new TextEncoder().encode(parts[0] + '.' + parts[1]);
    if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decode64(parts[2]), data)) return deny(403);
    return null;
  } catch { return deny(403); }
}
interface InquiryRow { id: string; created_at: string; updated_at: string; contact_name: string; contact_email: string; project_type: string; description: string; budget: string; timeline: string; status: string; notification_status: string; }
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const rejection = await authorize(request, env);
  if (rejection) return rejection;
  const url = new URL(request.url);
  const status = url.searchParams.get('status') ?? 'all';
  const statuses = ['all','new','reviewing','contacted','qualified','quoted','won','lost','archived'];
  if (!statuses.includes(status)) return Response.json({ error: 'INVALID_STATUS' }, { status: 400, headers });
  const limit = Math.min(50, Math.max(1, Number.parseInt(url.searchParams.get('limit') ?? '25', 10) || 25));
  const q = (url.searchParams.get('q') ?? '').trim().slice(0,200);
  const sort = url.searchParams.get('sort') ?? 'newest';
  const sorts: Record<string,string> = {newest:'created_at DESC,id DESC',oldest:'created_at ASC,id ASC',followup:'follow_up_at IS NULL,follow_up_at ASC,id ASC'};
  if (!Object.hasOwn(sorts,sort)) return Response.json({error:'INVALID_SORT'},{status:400,headers});
  const offset = Math.min(100000,Math.max(0,Number.parseInt(url.searchParams.get('offset') ?? '0',10)||0));
  try {
    const where = ' WHERE (? = ? OR status = ?) AND (? = ? OR instr(lower(contact_name || char(10) || contact_email || char(10) || project_type || char(10) || id),lower(?)) > 0)';
    const args = [status,'all',status,q,'',q];
    const fields = 'id,created_at,updated_at,contact_name,contact_email,project_type,description,budget,timeline,status,notification_status,notification_attempts,last_notification_error,selected_service,source,read_at,follow_up_at';
    const result = await env.INQUIRIES_DB!.prepare('SELECT '+fields+', (SELECT count(*) FROM consultation_inquiries d WHERE lower(d.contact_email) = lower(consultation_inquiries.contact_email) AND d.id <> consultation_inquiries.id) AS duplicate_count FROM consultation_inquiries'+where+' ORDER BY '+sorts[sort]+' LIMIT ? OFFSET ?').bind(...args,limit,offset).all();
    const counts = await env.INQUIRIES_DB!.prepare('SELECT count(*) AS total FROM consultation_inquiries'+where).bind(...args).first<{total:number}>();
    const unread = await env.INQUIRIES_DB!.prepare('SELECT count(*) AS total FROM consultation_inquiries WHERE read_at IS NULL').first<{total:number}>();
    return Response.json({inquiries:result.results,limit,offset,total:counts?.total ?? 0,unread:unread?.total ?? 0},{headers});
  } catch { return Response.json({error:'QUERY_UNAVAILABLE'},{status:503,headers}); }
};
