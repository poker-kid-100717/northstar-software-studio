interface Env { RESEND_API_KEY?: string; CONSULTATION_FROM_EMAIL?: string; }
interface Inquiry { name?: unknown; email?: unknown; projectType?: unknown; description?: unknown; budget?: unknown; timeline?: unknown; website?: unknown; }
const allowedTypes = new Set(['software-repair','integration','automation','application','other']);
const allowedBudgets = new Set(['unsure','under-250','250-1000','1000-5000','5000-plus']);
const allowedTimelines = new Set(['flexible','this-week','2-4-weeks','later']);
const recipient = 'joshuad100717@outlook.com';
const json = (message: string, status: number) => Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return json('INVALID_CONTENT_TYPE',415);
  if (Number(request.headers.get('content-length') || 0) > 12000) return json('PAYLOAD_TOO_LARGE',413);
  let body: Inquiry;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 12000) return json('PAYLOAD_TOO_LARGE',413);
    body = JSON.parse(raw) as Inquiry;
  } catch { return json('INVALID_JSON',400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json('INVALID_PAYLOAD',400);
  if (typeof body.website === 'string' && body.website.trim()) return Response.json({ ok: true });
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const projectType = typeof body.projectType === 'string' ? body.projectType : '';
  const budget = typeof body.budget === 'string' ? body.budget : '';
  const timeline = typeof body.timeline === 'string' ? body.timeline : '';
  if (!name || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      description.length < 30 || description.length > 3000 || !allowedTypes.has(projectType) ||
      !allowedBudgets.has(budget) || !allowedTimelines.has(timeline)) return json('INVALID_INQUIRY',400);
  if (!env.RESEND_API_KEY || !env.CONSULTATION_FROM_EMAIL) return json('INQUIRY_NOT_CONFIGURED',503);
  const text = ['New Northstar consultation inquiry', 'Name: '+name, 'Email: '+email,
    'Project type: '+projectType, 'Budget: '+budget, 'Timeline: '+timeline, '', 'Description:', description].join('\n');
  try {
    const upstream = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: 'Bearer '+env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.CONSULTATION_FROM_EMAIL, to: [recipient],
        reply_to: email, subject: 'Northstar consultation inquiry: '+projectType, text })
    });
    if (!upstream.ok) return json('DELIVERY_FAILED',502);
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return json('DELIVERY_FAILED',502); }
};
