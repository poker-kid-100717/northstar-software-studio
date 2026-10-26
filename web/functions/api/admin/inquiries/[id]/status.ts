import { authorize } from '../../inquiries';

interface Env {
  INQUIRIES_DB?: {
    prepare(sql: string): {
      bind(...values: unknown[]): {
        run(): Promise<{ meta?: { changes?: number } }>;
      };
    };
  };
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  CF_ACCESS_ADMIN_EMAIL?: string;
}
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
    const result = await env.INQUIRIES_DB!.prepare(
      "UPDATE consultation_inquiries SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?"
    ).bind(body.status, id).run();
    if (!result.meta?.changes) return json({ error: 'INQUIRY_NOT_FOUND' }, 404);
    return json({ ok: true, id, status: body.status });
  } catch { return json({ error: 'UPDATE_UNAVAILABLE' }, 503); }
};
