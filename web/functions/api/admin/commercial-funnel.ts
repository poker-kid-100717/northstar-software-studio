import { authorize } from './inquiries';
import type { Env } from '../../_lib/inquiry';

const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const statuses = ['new','reviewing','contacted','qualified','quoted','won','lost','archived'] as const;

/**
 * Owner-only, aggregate funnel snapshot. Does not expose customer records or PII.
 * Counts are observational; a completed Stripe payment must come from verified order state.
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await authorize(request, env);
  if (denied) return denied;
  const daysValue = new URL(request.url).searchParams.get('days') ?? '30';
  if (!/^(7|30|60|90)$/.test(daysValue)) {
    return Response.json({ error: 'INVALID_WINDOW' }, { status: 400, headers });
  }
  const days = Number(daysValue);
  const since = new Date(Date.now() - days * 86400000).toISOString();
  try {
    const db = env.INQUIRIES_DB!;
    const inquiries = await db.prepare(
      "SELECT status, count(*) AS total FROM consultation_inquiries WHERE created_at >= ? GROUP BY status"
    ).bind(since).all<{ status: string; total: number }>();
    const quotes = await db.prepare(
      "SELECT status, count(*) AS total FROM service_quotes WHERE created_at >= ? GROUP BY status"
    ).bind(since).all<{ status: string; total: number }>();
    const orders = await db.prepare(
      "SELECT status, count(*) AS total, coalesce(sum(amount_cents),0) AS amount_cents FROM service_orders WHERE created_at >= ? GROUP BY status"
    ).bind(since).all<{ status: string; total: number; amount_cents: number }>();
    const inquiryCounts: Record<string,number> = Object.fromEntries(statuses.map(s => [s,0]));
    for (const row of inquiries.results) {
      if (Object.hasOwn(inquiryCounts,row.status)) inquiryCounts[row.status] = row.total;
    }
    const totalInquiries = Object.values(inquiryCounts).reduce((a,b)=>a+b,0);
    const count = (rows: Array<{ status: string; total: number }>, states: string[]) =>
      rows.filter(row=>states.includes(row.status)).reduce((sum,row)=>sum+row.total,0);
    const paid = orders.results.filter(row=>['paid','in_progress','delivered','revision','completed'].includes(row.status));
    const paidOrders = paid.reduce((sum,row)=>sum+row.total,0);
    const paidAmountCents = paid.reduce((sum,row)=>sum+row.amount_cents,0);
    return Response.json({
      windowDays: days, generatedAt: new Date().toISOString(),
      inquiries: { total: totalInquiries, byStatus: inquiryCounts },
      quotes: { total: quotes.results.reduce((sum,row)=>sum+row.total,0), accepted: count(quotes.results,['accepted']) },
      orders: { total: orders.results.reduce((sum,row)=>sum+row.total,0), paid: paidOrders, completed: count(orders.results,['completed']), paidAmountCents },
      inquiryToPaidOrderRate: totalInquiries > 0 ? paidOrders / totalInquiries : null,
      caveats: ['Counts use record creation dates, not event timestamps or cohort attribution.', 'Paid amount is booked order value, not reconciled revenue or profit.', 'No visitor analytics, referral attribution, fees or labor hours are included.']
    }, { headers });
  } catch {
    return Response.json({ error: 'FUNNEL_UNAVAILABLE' }, { status: 503, headers });
  }
};
