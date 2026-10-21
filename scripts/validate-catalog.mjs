import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'server/catalog.json'), 'utf8'));
const errors = [];
if (catalog.categories.length !== 12) errors.push(`Expected 12 categories, got ${catalog.categories.length}`);
if (catalog.districts.length !== 64) errors.push(`Expected 64 districts, got ${catalog.districts.length}`);
if (new Set(catalog.districts).size !== catalog.districts.length) errors.push('District names are not unique');
const keys = new Set(); const slugs = new Set();
for (const c of catalog.categories) {
  if (!c.key || keys.has(c.key)) errors.push(`Missing/duplicate category key: ${c.key}`);
  if (!c.slug || slugs.has(c.slug)) errors.push(`Missing/duplicate category slug: ${c.slug}`);
  if (!Array.isArray(c.subcategories) || c.subcategories.length === 0 || new Set(c.subcategories).size !== c.subcategories.length) errors.push(`Invalid subcategories for ${c.key}`);
  keys.add(c.key); slugs.add(c.slug);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Catalog OK: ${catalog.categories.length} categories, ${catalog.districts.length} districts, ${catalog.categories.reduce((n,c)=>n+c.subcategories.length,0)} subcategories.`);
