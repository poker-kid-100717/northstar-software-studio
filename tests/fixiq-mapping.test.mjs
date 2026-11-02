import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

// The mapping module is erasable TypeScript, so strip types and import it as ESM.
const src = stripTypeScriptTypes(readFileSync(new URL('../web/src/app/fixiq-mapping.ts', import.meta.url), 'utf8'));
const { catalogCategoryFor, parseCatalogCategory, CATALOG_CATEGORIES } = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));
const catalogSource = readFileSync(new URL('../web/src/app/catalog.component.ts', import.meta.url), 'utf8');

test('every FixIQ category maps to a real catalog category', () => {
  for (const c of ['integration', 'automation', 'data', 'application', 'unsure']) {
    assert.ok(CATALOG_CATEGORIES.includes(catalogCategoryFor(c)), c);
  }
  assert.equal(catalogCategoryFor('integration'), 'APIs & integrations');
  assert.equal(catalogCategoryFor('automation'), 'Automation & deployment');
  assert.equal(catalogCategoryFor('data'), 'Data & spreadsheets');
  assert.equal(catalogCategoryFor('application'), 'Websites & forms');
  assert.equal(catalogCategoryFor('unsure'), 'All');
  assert.equal(catalogCategoryFor('bogus'), 'All');
});

test('mapped categories each have listings in the catalog', () => {
  for (const c of CATALOG_CATEGORIES.filter(x => x !== 'All')) {
    assert.ok(catalogSource.includes(`category:"${c}"`) || catalogSource.includes(`category:'${c}'`), `no listing for ${c}`);
  }
});

test('untrusted category query values fall back to no filter', () => {
  assert.equal(parseCatalogCategory('Data & spreadsheets'), 'Data & spreadsheets');
  for (const bad of [null, undefined, 42, '<script>', '', 'data & spreadsheets', {}]) assert.equal(parseCatalogCategory(bad), 'All');
});
