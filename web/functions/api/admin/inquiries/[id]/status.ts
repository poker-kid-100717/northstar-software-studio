import { authorize } from '../../inquiries';

type Env = Parameters<typeof authorize>[1];
const statuses = new Set(['new', 'reviewing', 'contacted', 'qualified', 'quoted', 'won', 'lost', 'archived']);
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const json = (data: object, status = 200) => Response.json(data, { status, headers });

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  const rejection = await authorize(request, env);
  if (rejection) return rejection;
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'INVALID_ORIGIN' }, 403);
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return json({ error: 'INVALID_CONTENT_TYPE' }, 415);
  const id = params['id'];
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(id)) return json({ error: 'INVALID_ID' }, 400);
  let body: unknown;
  try {
    if (Number(request.headers.get('Content-Length') || 0) > 1024) return json({ error: 'INVALID_BODY' }, 400);
    body = await request.json();
  } catch { return json({ error: 'INVALID_BODY' }, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body) || !('status' in body) ||
      typeof body.status !== 'string' || !statuses.has(body.status)) return json({ error: 'INVALID_STATUS' }, 400);
  try {
    const existing = await env.INQUIRIES_DB!.prepare('SELECT status FROM consultation_inquiries WHERE id = ?').bind(id).first<{status:string}>();
    if (!existing) return json({ error: 'INQUIRY_NOT_FOUND' }, 404);
    if (existing.status === body.status) return json({ ok: true, id, status: body.status, unchanged: true });
    const db = env.INQUIRIES_DB! as typeof env.INQUIRIES_DB & { batch(statements: unknown[]): Promise<unknown[]> };
    const update = db.prepare("UPDATE consultation_inquiries SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ? AND status = ?").bind(body.status, id, existing.status);
    const history = db.prepare("INSERT INTO inquiry_activity (id,inquiry_id,kind,old_status,new_status,actor) SELECT ?,id,'status',status,?,? FROM consultation_inquiries WHERE id = ? AND status = ?").bind(crypto.randomUUID(),body.status,env.CF_ACCESS_ADMIN_EMAIL,id,existing.status);
    // D1 batch is transactional: history insertion and status update succeed or fail together.
    const results = await db.batch([history,update]) as Array<{meta?:{changes?:number}}>;
    if (!results[1]?.meta?.changes) return json({ error: 'STATUS_CONFLICT' }, 409);
    return json({ ok: true, id, status: body.status });
  } catch { return json({ error: 'UPDATE_UNAVAILABLE' }, 503); }
};
