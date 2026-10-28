export interface Result { success: boolean; meta?: { changes?: number }; results?: unknown[] }
export interface Statement {
  bind(...values: unknown[]): Statement;
  run(): Promise<Result>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}
export interface Database { prepare(sql: string): Statement; batch(statements: Statement[]): Promise<Result[]> }
export interface Env {
  INQUIRIES_DB?: Database; RESEND_API_KEY?: string; CONSULTATION_FROM_EMAIL?: string;
  CONSULTATION_NOTIFY_EMAIL?: string; TURNSTILE_SITE_KEY?: string; TURNSTILE_SECRET_KEY?: string;
  CF_ACCESS_TEAM_DOMAIN?: string; CF_ACCESS_AUD?: string; CF_ACCESS_ADMIN_EMAIL?: string;
}
export const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
export const json = (data: object, status = 200) => Response.json(data, { status, headers });
export const validId = (id: unknown): id is string => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
export function mutationGuard(request: Request): Response | null {
  // Access uses a browser cookie. Require an explicit same-origin JSON request.
  if (request.headers.get('origin') !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site') return json({ error: 'INVALID_ORIGIN' }, 403);
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return json({ error: 'INVALID_CONTENT_TYPE' }, 415);
  return null;
}
export async function readJson(request: Request, limit: number): Promise<Record<string, unknown>> {
  if (Number(request.headers.get('content-length') || 0) > limit) throw new Error('BODY_LIMIT');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('BODY_REQUIRED');
  const chunks: Uint8Array[] = []; let length = 0;
  for (;;) {
    const { value, done } = await reader.read(); if (done) break;
    length += value.length;
    if (length > limit) { await reader.cancel(); throw new Error('BODY_LIMIT'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const body: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('INVALID_BODY');
  return body as Record<string, unknown>;
}
export async function digest(value: string): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), b => b.toString(16).padStart(2, '0')).join('');
}
export async function deliver(env: Env, id: string): Promise<'sent' | 'pending'> {
  const db = env.INQUIRIES_DB!;
  const lease = crypto.randomUUID();
  // Atomic lease prevents concurrent intake/retry requests from sending twice.
  const row = await db.prepare(`UPDATE consultation_inquiries SET notification_lease = ?, notification_lease_until = datetime('now','+2 minutes'), notification_attempts = notification_attempts + 1
    WHERE id = ? AND notification_status <> 'sent' AND notification_attempts < 8
    AND created_at > strftime('%Y-%m-%dT%H:%M:%fZ','now','-23 hours')
    AND (notification_next_at IS NULL OR notification_next_at <= datetime('now'))
    AND (notification_lease_until IS NULL OR notification_lease_until <= datetime('now')) RETURNING *`).bind(lease, id).first<Record<string, string>>();
  if (!row) return 'pending';
  let sent = false;
  const recipient = (env.CONSULTATION_NOTIFY_EMAIL || 'joshuad100717@outlook.com').trim();
  try {
    if (env.RESEND_API_KEY && env.CONSULTATION_FROM_EMAIL && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST', signal: AbortSignal.timeout(10000),
        headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json', 'Idempotency-Key': 'inquiry/' + id },
        body: JSON.stringify({ from: env.CONSULTATION_FROM_EMAIL, to: [recipient], reply_to: row['contact_email'], subject: 'Northstar consultation inquiry',
          text: ['Reference: ' + id, 'Name: ' + row['contact_name'], 'Email: ' + row['contact_email'], 'Project: ' + row['project_type'], 'Selected service: ' + (row['selected_service'] || 'Not specified'), 'Budget: ' + row['budget'], 'Timeline: ' + row['timeline'], '', row['description']].join('\n') })
      });
      sent = response.ok;
    }
  } catch { /* Keep provider responses and request data out of logs. */ }
  // A failed acknowledgement leaves the lease recoverable. The provider key stays stable.
  await db.prepare(`UPDATE consultation_inquiries SET notification_status = ?, last_notification_error = ?, notification_lease = NULL, notification_lease_until = NULL,
    notification_next_at = datetime('now','+1 hour') WHERE id = ? AND notification_lease = ?`)
    .bind(sent ? 'sent' : 'failed', sent ? null : 'DELIVERY_UNAVAILABLE', id, lease).run();
  return sent ? 'sent' : 'pending';
}
