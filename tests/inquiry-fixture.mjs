import { registerHooks } from 'node:module';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import ts from '../web/node_modules/typescript/lib/typescript.js';
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && context.parentURL?.endsWith('.ts') && !specifier.endsWith('.ts')) specifier += '.ts';
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith('.ts')) return {format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText};
    return next(url,context);
  }
});
export class D1 {
  constructor() {
    this.db = new DatabaseSync(':memory:'); this.db.exec('PRAGMA foreign_keys=ON');
    for(const f of readdirSync(new URL('../web/migrations/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort()) this.db.exec(readFileSync(new URL('../web/migrations/'+f,import.meta.url),'utf8'));
    this.fail = null;
  }
  prepare(sql) {
    const database=this;
    let args=[];
    return {
      bind(...values){args=values;return this;},
      async run(){if(database.fail?.test(sql))throw new Error('synthetic failure');const r=database.db.prepare(sql).run(...args);return {success:true,meta:{changes:Number(r.changes)}};},
      async first(){if(database.fail?.test(sql))throw new Error('synthetic failure');return database.db.prepare(sql).get(...args) ?? null;},
      async all(){if(database.fail?.test(sql))throw new Error('synthetic failure');return {results:database.db.prepare(sql).all(...args)};}
    };
  }
  async batch(statements) {
    this.db.exec('BEGIN');try { const results=[];for(const s of statements)results.push(await s.run());this.db.exec('COMMIT');return results; }catch(e){this.db.exec('ROLLBACK');throw e;}
  }
}
export const handlers = {
 intake: await import('../web/functions/api/consultation-inquiries.ts'),
 list: await import('../web/functions/api/admin/inquiries.ts'),
 middleware: await import('../web/functions/api/admin/_middleware.ts'),
 status: await import('../web/functions/api/admin/inquiries/[id]/status.ts'),
 activity: await import('../web/functions/api/admin/inquiries/[id]/activity.ts'),
 detail: await import('../web/functions/api/admin/inquiries/[id].ts'),
 retry: await import('../web/functions/api/admin/inquiries/retry.ts'),
 csv: await import('../web/functions/api/admin/inquiries/export.ts'),
 lib: await import('../web/functions/_lib/inquiry.ts')
};
