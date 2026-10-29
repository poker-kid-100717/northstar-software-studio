import { authorize } from './inquiries';
import { mutationGuard, readJson } from '../../_lib/inquiry';
import type { Env } from '../../_lib/inquiry';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const respond=(data:object,status=200)=>Response.json(data,{status,headers});
const categories=['labor','hosting','software','payment_fee','marketing','other'];
export const onRequestGet: PagesFunction<Env> = async ({request,env}) => {
 const denied=await authorize(request,env);if(denied)return denied;
 const days=new URL(request.url).searchParams.get('days')??'30';
 if(!['7','30','60','90'].includes(days))return respond({error:'INVALID_WINDOW'},400);
 try {
  const since=new Date(Date.now()-Number(days)*86400000).toISOString().slice(0,10);
  const rows=await env.INQUIRIES_DB!.prepare('SELECT category, count(*) AS entries, sum(cost_cents) AS cost_cents, sum(minutes) AS minutes FROM commercial_operating_entries WHERE entry_date>=? GROUP BY category').bind(since).all<{category:string;entries:number;cost_cents:number;minutes:number}>();
  return respond({windowDays:Number(days),costCents:rows.results.reduce((n,r)=>n+r.cost_cents,0),minutes:rows.results.reduce((n,r)=>n+r.minutes,0),byCategory:rows.results,caveat:'Manual expense and labor entries only; not an accounting or payment-provider reconciliation.'});
 }catch{return respond({error:'OPERATING_LEDGER_UNAVAILABLE'},503);}
};
export const onRequestPost: PagesFunction<Env> = async ({request,env}) => {
 const denied=await authorize(request,env);if(denied)return denied;
 const guarded=mutationGuard(request);if(guarded)return guarded;
 let data:Record<string,unknown>;
 try{data=await readJson(request,2048);}catch{return respond({error:'INVALID_BODY'},400);}
 const {entryDate,category,costCents,minutes,note}=data;
 const cost=costCents??0,mins=minutes??0,description=note??'';
 if(typeof entryDate!=='string'||!/^(20\d{2})-(\d{2})-(\d{2})$/.test(entryDate)||new Date(entryDate+'T00:00:00Z').toISOString().slice(0,10)!==entryDate||
    entryDate>new Date().toISOString().slice(0,10)||typeof category!=='string'||!categories.includes(category)||
    !Number.isSafeInteger(cost)||Number(cost)<0||Number(cost)>100000000||!Number.isSafeInteger(mins)||Number(mins)<0||Number(mins)>1440||
    (Number(cost)===0&&Number(mins)===0)||typeof description!=='string'||description.length>160)return respond({error:'INVALID_ENTRY'},400);
 const id=crypto.randomUUID();
 try{
  await env.INQUIRIES_DB!.prepare('INSERT INTO commercial_operating_entries(id,entry_date,category,cost_cents,minutes,note) VALUES(?,?,?,?,?,?)').bind(id,entryDate,category,cost,mins,description).run();
  return respond({id,ok:true},201);
 }catch{return respond({error:'OPERATING_LEDGER_UNAVAILABLE'},503);}
};
