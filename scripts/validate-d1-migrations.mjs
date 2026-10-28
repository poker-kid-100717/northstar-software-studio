import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const migrationDirectory=new URL('../web/migrations/',import.meta.url);
export const migrations=readdirSync(migrationDirectory).filter(n=>n.endsWith('.sql')).sort();
export function apply(db, names=migrations) {
 for(const name of names) db.exec(readFileSync(new URL(name,migrationDirectory),'utf8'));
}
export function fresh() {
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');apply(db);return db;
}
export const schemaSQL="SELECT type,name,tbl_name,sql FROM sqlite_master WHERE type IN ('table','index','trigger') AND name NOT LIKE 'sqlite_%' AND sql IS NOT NULL ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 ELSE 2 END,name";
export const schemaRows=db=>db.prepare(schemaSQL).all();
const quote=name=>'"'+name.replaceAll('"','""')+'"';
function tokens(sql) {
 return (sql.replace(/--[^\n]*|\/\*[\s\S]*?\*\//g,'').match(/'(?:''|[^'])*'|"(?:\"\"|[^"])*"|\[[^\]]*\]|[A-Za-z_][A-Za-z_0-9]*|[0-9]+|\S/g) ?? [])
  .map(t=>t.startsWith("'")?t:t.startsWith('"')?t.slice(1,-1).replaceAll('""','"').toLowerCase():t.toLowerCase());
}
const normalized=sql=>tokens(sql ?? '').join(' ').replace(/\bif not exists /g,'');
function checks(sql) {
 const t=tokens(sql),result=[];
 for(let i=0;i<t.length;i++)if(t[i]==='check' && t[i+1]==='('){
  let depth=0,j=i+1;
  do{if(t[j]==='(')depth++;if(t[j]===')')depth--;j++;}while(depth && j<t.length);
  result.push(t.slice(i,j).join(' '));i=j-1;
 }
 return result;
}
export function compareSchema(expected,rows) {
 const errors=[],actual=new DatabaseSync(':memory:'),expectedRows=schemaRows(expected);
 const required=new Map(expectedRows.map(r=>[r.type+':'+r.name,r]));
 try {
  // Reconstruct only known schema objects in an empty in-memory DB. No customer rows.
  for(const row of rows) {
   if(!required.has(row.type+':'+row.name))continue;
   if(typeof row.sql!=='string' || !/^CREATE\s+(?:TABLE|(?:UNIQUE\s+)?INDEX|TRIGGER)\b/i.test(row.sql))throw new Error('INVALID_SCHEMA_OBJECT');
   actual.prepare(row.sql).run();
  }
  const present=new Map(schemaRows(actual).map(r=>[r.type+':'+r.name,r]));
  for(const row of expectedRows) {
   const found=present.get(row.type+':'+row.name);
   if(!found){errors.push('Missing '+row.type+' '+row.name);continue;}
   if(row.type!=='table'){
    if(normalized(row.sql)!==normalized(found.sql))errors.push('Changed '+row.type+' '+row.name);
    continue;
   }
   const columns=actual.prepare('PRAGMA table_info('+quote(row.name)+')').all();
   for(const col of expected.prepare('PRAGMA table_info('+quote(row.name)+')').all()){
    const current=columns.find(c=>c.name===col.name);
    if(!current){errors.push('Missing column '+row.name+'.'+col.name);continue;}
    if(['type','notnull','pk'].some(k=>String(current[k]).toLowerCase()!==String(col[k]).toLowerCase()) || normalized(current.dflt_value)!==normalized(col.dflt_value))errors.push('Changed column '+row.name+'.'+col.name);
   }
   const actualChecks=checks(found.sql);
   for(const check of checks(row.sql))if(!actualChecks.includes(check))errors.push('Missing CHECK constraint in '+row.name);
   const fks=db=>db.prepare('PRAGMA foreign_key_list('+quote(row.name)+')').all().map(({id,...r})=>JSON.stringify(r));
   const actualFks=fks(actual);
   for(const fk of fks(expected))if(!actualFks.includes(fk))errors.push('Missing foreign key in '+row.name);
   const unique=db=>db.prepare('PRAGMA index_list('+quote(row.name)+')').all().filter(r=>r.unique).map(r=>JSON.stringify(db.prepare('PRAGMA index_info('+quote(r.name)+')').all().map(c=>c.name)));
   const actualUnique=unique(actual);
   for(const index of unique(expected))if(!actualUnique.includes(index))errors.push('Missing unique constraint in '+row.name);
  }
 } finally {actual.close();}
 return errors;
}
export async function checkRemote({accountId,databaseId,token},fetcher=fetch) {
 if(!/^[0-9a-f]{32}$/i.test(accountId ?? '') || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(databaseId ?? '') || !token)throw new Error('Configure CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID and CLOUDFLARE_D1_READ_TOKEN. Production validation was not performed.');
 const response=await fetcher('https://api.cloudflare.com/client/v4/accounts/'+accountId+'/d1/database/'+databaseId+'/query',{
  method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:JSON.stringify({sql:schemaSQL}),signal:AbortSignal.timeout(15000)
 });
 if(!response.ok)throw new Error('D1 schema query failed (HTTP '+response.status+'). Check token/account/database permissions. No migration was applied.');
 let payload;try{payload=await response.json();}catch{throw new Error('D1 returned invalid JSON.');}
 if(payload.success!==true || !Array.isArray(payload.result) || payload.result.length!==1 || payload.result[0].success!==true || !Array.isArray(payload.result[0].results))throw new Error('D1 schema query was not successful. No migration was applied.');
 const expected=fresh();
 try {
  const errors=compareSchema(expected,payload.result[0].results);
  if(errors.length)throw new Error('D1 schema is not ready:\n'+errors.join('\n')+'\nApply reviewed missing migrations separately after backup, then rerun validation.');
  return {migrations:migrations.length,objects:schemaRows(expected).length};
 } finally {expected.close();}
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
 try{
  if(process.argv.includes('--remote')){
   const result=await checkRemote({accountId:process.env.CLOUDFLARE_ACCOUNT_ID,databaseId:process.env.CLOUDFLARE_D1_DATABASE_ID,token:process.env.CLOUDFLARE_D1_READ_TOKEN});
   console.log('D1 live schema validated: '+result.migrations+' migrations, '+result.objects+' required schema objects. No rows read or migrations applied.');
  } else {
   const db=fresh();
   if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok' || db.prepare('PRAGMA foreign_key_check').all().length)throw new Error('Migration integrity check failed');
   db.close();console.log('Fresh D1-compatible schema validated: '+migrations.length+' migrations.');
  }
 }catch(error){console.error(error.message);process.exitCode=1;}
}
