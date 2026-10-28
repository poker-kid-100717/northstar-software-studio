import { authorize } from '../inquiries';
import { headers, json } from '../../../_lib/inquiry';
type Env = Parameters<typeof authorize>[1];
// Quote every cell and prefix spreadsheet formulas, including leading control/space.
export const csvCell = (value: unknown): string => {
  let s = String(value ?? '');
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(s) || /^[\t\r\n]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g,'""') + '"';
};
export const onRequestGet: PagesFunction<Env> = async ({request,env}) => {
  const denied = await authorize(request,env); if (denied) return denied;
  try {
    const columns = ['id','created_at','contact_name','contact_email','project_type','budget','timeline','status','selected_service','source','follow_up_at','notification_status'];
    const offset = Math.min(100000,Math.max(0,Number.parseInt(new URL(request.url).searchParams.get('offset') ?? '0',10)||0));
    const result = await env.INQUIRIES_DB!.prepare('SELECT '+columns.join(',')+' FROM consultation_inquiries ORDER BY created_at DESC,id DESC LIMIT 500 OFFSET ?').bind(offset).all<Record<string,unknown>>();
    return new Response([columns.map(csvCell).join(','),...result.results.map(r=>columns.map(c=>csvCell(r[c])).join(','))].join('\r\n'),
      {headers:{...headers,'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="inquiries.csv"'}});
  } catch { return json({error:'EXPORT_UNAVAILABLE'},503); }
};
