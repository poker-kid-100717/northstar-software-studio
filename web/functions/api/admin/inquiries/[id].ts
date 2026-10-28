import { authorize } from '../inquiries';
import { json, mutationGuard, readJson, validId } from '../../../_lib/inquiry';
type Env = Parameters<typeof authorize>[1];
export const onRequestPatch: PagesFunction<Env> = async ({request,env,params}) => {
  const denied = await authorize(request,env); if (denied) return denied;
  const guard = mutationGuard(request); if (guard) return guard;
  const id = params['id']; if (!validId(id)) return json({error:'INVALID_ID'},400);
  let body: Record<string,unknown>;
  try { body = await readJson(request,1024); } catch { return json({error:'INVALID_BODY'},400); }
  if (body['read'] !== true && !Object.hasOwn(body,'followUpAt')) return json({error:'INVALID_UPDATE'},400);
  let date: string | null = null;
  if (Object.hasOwn(body,'followUpAt') && body['followUpAt'] !== null) {
    if (typeof body['followUpAt'] !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(body['followUpAt']) || !Number.isFinite(Date.parse(body['followUpAt']))) return json({error:'INVALID_DATE'},400);
    date = body['followUpAt'];
  }
  try {
    const result = await env.INQUIRIES_DB!.prepare("UPDATE consultation_inquiries SET read_at = CASE WHEN ? THEN coalesce(read_at,strftime('%Y-%m-%dT%H:%M:%fZ','now')) ELSE read_at END, follow_up_at = CASE WHEN ? THEN ? ELSE follow_up_at END, updated_by = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?")
      .bind(body['read'] === true ? 1:0,Object.hasOwn(body,'followUpAt') ? 1:0,date,env.CF_ACCESS_ADMIN_EMAIL!,id).run();
    if (!result.success) throw new Error('WRITE_FAILED');
    return result.meta?.changes ? json({ok:true}) : json({error:'INQUIRY_NOT_FOUND'},404);
  } catch { return json({error:'UPDATE_UNAVAILABLE'},503); }
};
export const onRequestDelete: PagesFunction<Env> = async ({request,env,params}) => {
  const denied = await authorize(request,env); if (denied) return denied;
  const guard = mutationGuard(request); if (guard) return guard;
  const id = params['id']; if (!validId(id)) return json({error:'INVALID_ID'},400);
  let body: Record<string,unknown>;
  try { body = await readJson(request,1024); } catch { return json({error:'INVALID_BODY'},400); }
  if (body['confirmReference'] !== id) return json({error:'CONFIRMATION_REQUIRED'},400);
  const db = env.INQUIRIES_DB!;
  try {
    // Atomic conditional deletion. Financial records are never cascaded away.
    const results = await db.batch([
      db.prepare('UPDATE consultation_inquiries SET updated_by = ? WHERE id = ?').bind(env.CF_ACCESS_ADMIN_EMAIL!,id),
      db.prepare("DELETE FROM consultation_inquiries WHERE id = ? AND status = 'archived' AND NOT EXISTS (SELECT 1 FROM service_quotes WHERE inquiry_id = ?)").bind(id,id)
    ]);
    if (results.some(r=>!r.success)) throw new Error('DELETE_FAILED');
    return results[1].meta?.changes ? json({ok:true}) : json({error:'ARCHIVE_FIRST_OR_LINKED_QUOTE'},409);
  } catch { return json({error:'DELETE_UNAVAILABLE'},503); }
};
