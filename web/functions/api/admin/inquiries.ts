interface InquiryDb {
  prepare(sql: string): {
    bind(...values: unknown[]): { all<T>(): Promise<{ results: T[] }>; first<T>(): Promise<T | null>; run(): Promise<unknown> };
    all<T>(): Promise<{ results: T[] }>;
  };
}
interface Env { INQUIRIES_DB?: InquiryDb; CF_ACCESS_TEAM_DOMAIN?: string; CF_ACCESS_AUD?: string; CF_ACCESS_ADMIN_EMAIL?: string; }
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const deny = (status: number) => Response.json({ error: status === 503 ? 'ADMIN_NOT_CONFIGURED' : 'NOT_AUTHORIZED' }, { status, headers });
const jwksCache = new Map<string, CryptoKey>();
function decode64(input: string): Uint8Array {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const bytes = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '='));
  return Uint8Array.from(bytes, c => c.charCodeAt(0));
}
export async function authorize(request: Request, env: Env): Promise<Response | null> {
  if (!env.CF_ACCESS_TEAM_DOMAIN || !env.CF_ACCESS_AUD || !env.CF_ACCESS_ADMIN_EMAIL || !env.INQUIRIES_DB) return deny(503);
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return deny(401);
  const domain = env.CF_ACCESS_TEAM_DOMAIN.replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(domain)) return deny(503);
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return deny(401);
    const header = JSON.parse(new TextDecoder().decode(decode64(parts[0]))) as { alg?: string; kid?: string };
    const claims = JSON.parse(new TextDecoder().decode(decode64(parts[1]))) as { iss?: string; aud?: string[] | string; exp?: number; nbf?: number; email?: string };
    if (header.alg !== 'RS256' || !header.kid || !claims.exp || claims.exp <= Date.now()/1000 ||
        (claims.nbf && claims.nbf > Date.now()/1000) ||
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
  try {
    const sql = 'SELECT id,created_at,updated_at,contact_name,contact_email,project_type,description,budget,timeline,status,notification_status FROM consultation_inquiries' +
      (status === 'all' ? '' : ' WHERE status = ?') + ' ORDER BY created_at DESC, id DESC LIMIT ?';
    const query = env.INQUIRIES_DB!.prepare(sql);
    const result = await (status === 'all' ? query.bind(limit) : query.bind(status, limit)).all<InquiryRow>();
    return Response.json({ inquiries: result.results, limit }, { headers });
  } catch { return Response.json({ error: 'QUERY_UNAVAILABLE' }, { status: 503, headers }); }
};
