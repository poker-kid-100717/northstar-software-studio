import { authorize } from '../inquiries';
import { deliver, json, mutationGuard, readJson } from '../../../_lib/inquiry';
type Env = Parameters<typeof authorize>[1];
export const onRequestPost: PagesFunction<Env> = async ({request,env}) => {
  const denied = await authorize(request,env); if (denied) return denied;
  const guard = mutationGuard(request); if (guard) return guard;
  try { await readJson(request,128); } catch { return json({error:'INVALID_BODY'},400); }
  try {
    const result = await env.INQUIRIES_DB!.prepare("SELECT id FROM consultation_inquiries WHERE notification_status <> 'sent' AND notification_attempts < 8 AND created_at > strftime('%Y-%m-%dT%H:%M:%fZ','now','-23 hours') AND (notification_next_at IS NULL OR notification_next_at <= datetime('now')) AND (notification_lease_until IS NULL OR notification_lease_until <= datetime('now')) ORDER BY created_at LIMIT 5").all<{id:string}>();
    let sent = 0;
    for (const row of result.results) if (await deliver(env,row.id) === 'sent') sent++;
    return json({processed:result.results.length,sent});
  } catch { return json({error:'RETRY_UNAVAILABLE'},503); }
};
