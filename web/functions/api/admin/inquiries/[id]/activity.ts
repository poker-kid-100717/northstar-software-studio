import { mutationGuard, readJson } from '../../../../_lib/inquiry';
import { authorize } from '../../inquiries';
type Env = Parameters<typeof authorize>[1];
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const json = (data: object, status = 200) => Response.json(data, { status, headers });
const validId = (id: unknown): id is string => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(id);
const db = (env: Env) => env.INQUIRIES_DB!;
export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
 const denied = await authorize(request, env); if (denied) return denied;
 const id = params['id']; if (!validId(id)) return json({error:'INVALID_ID'},400);
 try {
   const exists = await db(env).prepare('SELECT id FROM consultation_inquiries WHERE id = ?').bind(id).first<{id:string}>();
   if (!exists) return json({error:'INQUIRY_NOT_FOUND'},404);
   const result = await db(env).prepare('SELECT id,kind,body,old_status,new_status,actor,created_at FROM inquiry_activity WHERE inquiry_id = ? ORDER BY created_at DESC,id DESC LIMIT 100').bind(id).all();
   return json({activity:result.results});
 } catch { return json({error:'ACTIVITY_UNAVAILABLE'},503); }
};
export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
 const denied = await authorize(request, env); if (denied) return denied;
 const id = params['id']; if (!validId(id)) return json({error:'INVALID_ID'},400);
 const guard = mutationGuard(request); if (guard) return guard;
 let payload: unknown;
 try { payload = await readJson(request,8192); } catch { return json({error:'INVALID_BODY'},400); }
 if (!payload || typeof payload !== 'object' || Array.isArray(payload) || !('body' in payload) || typeof payload.body !== 'string' || !payload.body.trim() || payload.body.trim().length>2000) return json({error:'INVALID_NOTE'},400);
 const body=payload.body.trim();
 try {
   const exists=await db(env).prepare('SELECT id FROM consultation_inquiries WHERE id = ?').bind(id).first<{id:string}>();
   if (!exists) return json({error:'INQUIRY_NOT_FOUND'},404);
   const noteId=crypto.randomUUID();
   const saved = await db(env).prepare("INSERT INTO inquiry_activity (id,inquiry_id,kind,body,actor) VALUES (?,?,'note',?,?)").bind(noteId,id,body,env.CF_ACCESS_ADMIN_EMAIL).run();
   if (!saved.success) throw new Error('NOTE_WRITE_FAILED');
   return json({ok:true,id:noteId},201);
 } catch { return json({error:'NOTE_UNAVAILABLE'},503); }
};
