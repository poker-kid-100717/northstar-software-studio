import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

const src = stripTypeScriptTypes(readFileSync(new URL('../web/src/app/fix-slug.ts', import.meta.url), 'utf8'));
const { fixSlug } = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));
const catalog = readFileSync(new URL('../web/src/app/catalog.component.ts', import.meta.url), 'utf8');
const titles = [...catalog.matchAll(/\{title:(?:"([^"]+)"|'([^']+)')/g)].map(m => m[1] ?? m[2]);

test('catalog has the expected listings', () => assert.equal(titles.length, 65));

test('every listing has a unique, URL-safe slug', () => {
  const slugs = titles.map(fixSlug);
  assert.equal(new Set(slugs).size, slugs.length, 'duplicate slug');
  for (const s of slugs) assert.match(s, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
});

test('slugs are stable', () => {
  assert.equal(fixSlug('API 400/401 Troubleshooting'), 'api-400-401-troubleshooting');
  assert.equal(fixSlug('Code & .NET Fix'), 'code-and-net-fix');
  assert.equal(fixSlug('  C# Method Bug Fix '), 'c-method-bug-fix');
});
