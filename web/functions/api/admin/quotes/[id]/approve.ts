import { authorize } from '../../inquiries';

type Env = Parameters<typeof authorize>[1];
type Database = NonNullable<Env['INQUIRIES_DB']> & {
  batch(statements: unknown[]): Promise<Array<{ meta?: { changes?: number } }>>;
};
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const reply = (body: object, status = 200) => Response.json(body, { status, headers });
const validId = (id: unknown): id is string =>
  typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(id);

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const denied = await authorize(request, env);
  if (denied) return denied;
  const id = params['id'];
  if (!validId(id)) return reply({ error: 'INVALID_ID' }, 400);
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return reply({ error: 'INVALID_ORIGIN' }, 403);
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))
    return reply({ error: 'INVALID_CONTENT_TYPE' }, 415);
  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 2048) return reply({ error: 'INVALID_BODY' }, 400);
    body = JSON.parse(raw);
  } catch { return reply({ error: 'INVALID_BODY' }, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return reply({ error: 'INVALID_BODY' }, 400);
  const data = body as Record<string, unknown>;
  if (Object.keys(data).some(k => !['expectedVersion', 'expiresAt'].includes(k)) ||
      !Number.isSafeInteger(data['expectedVersion']) || (data['expectedVersion'] as number) < 1 ||
      typeof data['expiresAt'] !== 'string') return reply({ error: 'INVALID_APPROVAL' }, 400);
  const expiresAt = data['expiresAt'];
  const expiration = Date.parse(expiresAt);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(expiresAt) ||
      !Number.isFinite(expiration) || expiration <= Date.now() + 60000 ||
      expiration > Date.now() + 90 * 86400000) return reply({ error: 'INVALID_EXPIRY' }, 400);
  const expectedVersion = data['expectedVersion'] as number;
  const db = env.INQUIRIES_DB! as Database;
  try {
    const current = await db.prepare('SELECT status,version FROM service_quotes WHERE id = ?')
      .bind(id).first<{ status: string; version: number }>();
    if (!current) return reply({ error: 'QUOTE_NOT_FOUND' }, 404);
    if (current.status !== 'draft' || current.version !== expectedVersion)
      return reply({ error: 'QUOTE_CONFLICT' }, 409);

    const eventId = crypto.randomUUID();
    // A conditional audit insert aborts the entire atomic batch on a stale update.
    const results = await db.batch([
      db.prepare(
        "UPDATE service_quotes SET status = 'approved', expires_at = ?, approved_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'), approved_by = ?, version = version + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ? AND status = 'draft' AND version = ?"
      ).bind(expiresAt, env.CF_ACCESS_ADMIN_EMAIL!, id, expectedVersion),
      db.prepare(
        "INSERT INTO commerce_events (id,entity_type,entity_id,event_type,old_status,new_status,actor,details_json) VALUES (?,'quote',?,'approved','draft','approved',?,?)"
      ).bind(eventId, id, env.CF_ACCESS_ADMIN_EMAIL!, JSON.stringify({ expiresAt }))
    ]);
    if (results[0]?.meta?.changes !== 1) return reply({ error: 'QUOTE_CONFLICT' }, 409);
    return reply({ ok: true, id, status: 'approved', version: expectedVersion + 1, expiresAt });
  } catch { return reply({ error: 'APPROVAL_UNAVAILABLE' }, 503); }
};
