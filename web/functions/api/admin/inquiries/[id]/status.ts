import { authorize } from '../../inquiries';
import { mutationGuard, readJson, validId, json } from '../../../../_lib/inquiry';
type Env = Parameters<typeof authorize>[1];
const statuses = new Set(['new','reviewing','contacted','qualified','quoted','won','lost','archived']);
export const onRequestPatch: PagesFunction<Env> = async ({request,env,params}) => {
  const denied = await authorize(request,env); if (denied) return denied;
  const guard = mutationGuard(request); if (guard) return guard;
  const id = params['id']; if (!validId(id)) return json({error:'INVALID_ID'},400);
  let body: Record<string,unknown>;
  try { body = await readJson(request,1024); } catch { return json({error:'INVALID_BODY'},400); }
  if (typeof body['status'] !== 'string' || !statuses.has(body['status'])) return json({error:'INVALID_STATUS'},400);
  try {
    const result = await env.INQUIRIES_DB!.prepare("UPDATE consultation_inquiries SET status = ?, updated_by = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?")
      .bind(body['status'],env.CF_ACCESS_ADMIN_EMAIL!,id).run();
    if (!result.success) throw new Error('UPDATE_FAILED');
    if (!result.meta?.changes) return json({error:'INQUIRY_NOT_FOUND'},404);
    return json({ok:true,id,status:body['status']});
  } catch { return json({error:'UPDATE_UNAVAILABLE'},503); }
};
