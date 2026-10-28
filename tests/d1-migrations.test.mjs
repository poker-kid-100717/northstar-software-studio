import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { apply, migrations, fresh, schemaRows, compareSchema, checkRemote, schemaSQL } from '../scripts/validate-d1-migrations.mjs';
const seed=db=>db.prepare("INSERT INTO consultation_inquiries(id,contact_name,contact_email,project_type,description,budget,timeline) VALUES ('synthetic','Example','example@example.test','other','Synthetic description with enough detail.','unsure','flexible')").run();
test('migration names are unique, ordered and sequential',()=>{
 const numbers=migrations.map(n=>n.split('_')[0]);assert.equal(new Set(numbers).size,numbers.length);
 assert.deepEqual(numbers,numbers.map((_,i)=>String(i+1).padStart(4,'0')));
});
test('fresh schema includes all migrations and satisfies integrity/foreign keys',()=>{
 const db=fresh();try{assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);assert.deepEqual(compareSchema(db,schemaRows(db)),[]);}finally{db.close();}
});
for(let prefix=1;prefix<=migrations.length;prefix++){
 test('upgrade from migration '+prefix+' preserves existing inquiry and related data',()=>{
  const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
  try{
   apply(db,migrations.slice(0,prefix));seed(db);
   if(prefix>=2)db.prepare("INSERT INTO inquiry_activity(id,inquiry_id,kind,body,actor) VALUES ('note','synthetic','note','Synthetic note','owner')").run();
   if(prefix>=3)db.prepare("INSERT INTO service_quotes(id,inquiry_id,service_name,deliverables,amount_cents) VALUES ('quote','synthetic','Synthetic service','Synthetic scope',100)").run();
   if(prefix>=4)db.prepare("INSERT INTO quote_access_tokens(quote_id,token_sha256,expires_at) VALUES ('quote',?,'2030-01-01')").run('a'.repeat(64));
   apply(db,migrations.slice(prefix));
   assert.equal(db.prepare("SELECT contact_email FROM consultation_inquiries WHERE id='synthetic'").get().contact_email,'example@example.test');
   if(prefix>=2)assert.equal(db.prepare("SELECT body FROM inquiry_activity WHERE id='note'").get().body,'Synthetic note');
   if(prefix>=3)assert.equal(db.prepare('SELECT amount_cents FROM service_quotes').get().amount_cents,100);
   if(prefix>=4)assert.equal(db.prepare('SELECT token_sha256 FROM quote_access_tokens').get().token_sha256,'a'.repeat(64));
   assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
   const expected=fresh();try{assert.deepEqual(compareSchema(expected,schemaRows(db)),[]);}finally{expected.close();}
   // The previous application's insert/update remains compatible after additive upgrade.
   db.prepare("UPDATE consultation_inquiries SET status='reviewing' WHERE id='synthetic'").run();
   assert.equal(db.prepare("SELECT actor FROM inquiry_activity WHERE kind='status'").get().actor,'system');
  }finally{db.close();}
 });
}
test('missing 0005, missing audit trigger and changed CHECK constraints are rejected',()=>{
 const expected=fresh(),old=new DatabaseSync(':memory:');
 try{
  apply(old,migrations.slice(0,4));
  assert.ok(compareSchema(expected,schemaRows(old)).some(s=>s.includes('idempotency_key')));
  const rows=schemaRows(expected);
  assert.ok(compareSchema(expected,rows.filter(r=>r.name!=='inquiry_status_audit')).some(s=>s.includes('inquiry_status_audit')));
  const changed=rows.map(r=>r.name==='consultation_inquiries'?{...r,sql:r.sql.replace("'new','reviewing'","'NEW','reviewing'")}:r);
  assert.ok(compareSchema(expected,changed).some(s=>s.includes('CHECK')));
 }finally{expected.close();old.close();}
});
test('schema comparison permits whitespace and unrelated additive objects',()=>{
 const db=fresh();try{
  const rows=schemaRows(db).map(r=>({...r,sql:r.sql.replace('CREATE TABLE','CREATE  TABLE')}));
  rows.push({type:'table',name:'unrelated',tbl_name:'unrelated',sql:'CREATE TABLE unrelated(id TEXT)'});
  assert.deepEqual(compareSchema(db,rows),[]);
 }finally{db.close();}
});
const config={accountId:'a'.repeat(32),databaseId:'10000000-0000-4000-8000-000000000001',token:'synthetic-not-a-real-secret'};
test('live validator only sends fixed schema metadata SELECT and accepts ready schema',async()=>{
 const db=fresh();try{
  let calls=0;
  const result=await checkRemote(config,async(url,init)=>{
   calls++;assert.match(url,/api.cloudflare.com\/client\/v4\/accounts\//);
   assert.equal(JSON.parse(init.body).sql,schemaSQL);assert.ok(!schemaSQL.includes('consultation_inquiries'));
   return Response.json({success:true,result:[{success:true,results:schemaRows(db)}]});
  });
  assert.equal(calls,1);assert.equal(result.migrations,migrations.length);
 }finally{db.close();}
});
test('live validator fails closed on missing configuration, API denial and schema drift',async()=>{
 let calls=0;await assert.rejects(checkRemote({},async()=>{calls++;}),/Configure/);assert.equal(calls,0);
 await assert.rejects(checkRemote(config,async()=>new Response('synthetic-private-upstream-body',{status:403})),/HTTP 403/);
 await assert.rejects(checkRemote(config,async()=>Response.json({success:false,result:[]})),/not successful/);
 await assert.rejects(checkRemote(config,async()=>Response.json({success:true,result:[{success:true,results:[]}]})),/Missing table/);
});
