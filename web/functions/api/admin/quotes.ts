import { authorize } from './inquiries';

type Env = Parameters<typeof authorize>[1];
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const json = (data: object, status = 200) => Response.json(data, { status, headers });
const validId = (id: unknown): id is string =>
  typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(id);

interface QuoteInput {
  inquiryId: string;
  serviceName: string;
  deliverables: string;
  exclusions?: string;
  amountCents: number;
}

function parseQuote(value: unknown): QuoteInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const p = value as Record<string, unknown>;
  if (!validId(p['inquiryId']) ||
      typeof p['serviceName'] !== 'string' || p['serviceName'].trim().length < 1 || p['serviceName'].trim().length > 120 ||
      typeof p['deliverables'] !== 'string' || p['deliverables'].trim().length < 1 || p['deliverables'].trim().length > 4000 ||
      (p['exclusions'] !== undefined && (typeof p['exclusions'] !== 'string' || p['exclusions'].length > 4000)) ||
      !Number.isSafeInteger(p['amountCents']) || (p['amountCents'] as number) < 1 || (p['amountCents'] as number) > 100000000) return null;
  return {
    inquiryId: p['inquiryId'],
    serviceName: p['serviceName'].trim(),
    deliverables: p['deliverables'].trim(),
    exclusions: (p['exclusions'] as string | undefined)?.trim() ?? '',
    amountCents: p['amountCents'] as number
  };
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await authorize(request, env);
  if (denied) return denied;
  const inquiryId = new URL(request.url).searchParams.get('inquiryId');
  if (!validId(inquiryId)) return json({ error: 'INVALID_INQUIRY_ID' }, 400);
  try {
    const result = await env.INQUIRIES_DB!.prepare(
      'SELECT id,inquiry_id,service_name,deliverables,exclusions,currency,amount_cents,status,version,expires_at,approved_at,approved_by,accepted_at,created_at,updated_at FROM service_quotes WHERE inquiry_id = ? ORDER BY created_at DESC,id DESC LIMIT 50'
    ).bind(inquiryId).all();
    return json({ quotes: result.results });
  } catch { return json({ error: 'QUOTES_UNAVAILABLE' }, 503); }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await authorize(request, env);
  if (denied) return denied;
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'INVALID_ORIGIN' }, 403);
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return json({ error: 'INVALID_CONTENT_TYPE' }, 415);
  if (Number(request.headers.get('Content-Length') || 0) > 10000) return json({ error: 'INVALID_BODY' }, 400);
  let raw: unknown;
  try {
    const body = await request.text();
    if (body.length > 10000) return json({ error: 'INVALID_BODY' }, 400);
    raw = JSON.parse(body);
  } catch { return json({ error: 'INVALID_BODY' }, 400); }
  const input = parseQuote(raw);
  if (!input) return json({ error: 'INVALID_QUOTE' }, 400);
  const id = crypto.randomUUID();
  const eventId = crypto.randomUUID();
  try {
    const inquiry = await env.INQUIRIES_DB!.prepare('SELECT id FROM consultation_inquiries WHERE id = ?')
      .bind(input.inquiryId).first();
    if (!inquiry) return json({ error: 'INQUIRY_NOT_FOUND' }, 404);
    // Cloudflare D1 batch is atomic: either both the draft and audit event are written, or neither.
    const database = env.INQUIRIES_DB! as NonNullable<Env['INQUIRIES_DB']> & { batch(statements: unknown[]): Promise<unknown> };
    await database.batch([
      database.prepare(
        'INSERT INTO service_quotes (id,inquiry_id,service_name,deliverables,exclusions,amount_cents) VALUES (?,?,?,?,?,?)'
      ).bind(id, input.inquiryId, input.serviceName, input.deliverables, input.exclusions, input.amountCents),
      database.prepare(
        "INSERT INTO commerce_events (id,entity_type,entity_id,event_type,new_status,actor) VALUES (?,'quote',?,'created','draft',?)"
      ).bind(eventId, id, env.CF_ACCESS_ADMIN_EMAIL!)
    ]);
    return json({ ok: true, id, status: 'draft' }, 201);
  } catch { return json({ error: 'QUOTE_CREATE_UNAVAILABLE' }, 503); }
};
