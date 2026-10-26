import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const frontend = readFileSync('web/src/app/catalog.component.ts', 'utf8');
const backend = readFileSync('src/Northstar.Api/Data/ProductSeed.cs', 'utf8');
const front = [...frontend.matchAll(/\{title:(["'])(.*?)\1,problem:.*?,outcome:.*?,scope:.*?,category:(["'])(.*?)\3,tier:.*?,price:(\d+)\}/g)]
  .map(m => [m[2], m[4], Number(m[5])]);
const back = [...backend.matchAll(/\((30|50|100), @"(?:[^"]|"")*", @"([^"]+)", @"([^"]+)",/g)]
  .map(m => [m[2], m[3], Number(m[1])]);
assert.equal(front.length, 65, 'Expected 65 customer-facing fixes');
assert.equal(back.length, 65, 'Expected 65 backend seed definitions');
const key = r => JSON.stringify(r);
assert.deepEqual(front.map(key).sort(), back.map(key).sort(), 'Frontend and backend names/categories/prices must match');
const counts = Object.groupBy(front, r => r[1]);
assert.equal(Object.keys(counts).length, 5, 'Expected five problem categories');
for (const [category, list] of Object.entries(counts)) {
  assert.ok(list.length >= 10 && list.length <= 15, category + ' should have 10-15 services');
  for (const price of [30, 50, 100]) assert.ok(list.some(r => r[2] === price), category + ' missing price ' + price);
}
console.log('Catalog parity OK: 65 listings, 5 categories, all price tiers.');
