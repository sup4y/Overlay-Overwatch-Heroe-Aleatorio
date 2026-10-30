/**
 * Checks that every translation file has exactly the same keys as the Spanish one.
 * Usage: node scripts/check-i18n.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'public/i18n';
const BASE = 'es.json';

const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([key, value]) =>
    value && typeof value === 'object' ? flatten(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  );

const keysOf = (file) => new Set(flatten(JSON.parse(readFileSync(join(DIR, file), 'utf8'))));

const base = keysOf(BASE);
let ok = true;
for (const file of readdirSync(DIR).filter((f) => f.endsWith('.json') && f !== BASE)) {
  const keys = keysOf(file);
  const missing = [...base].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !base.has(k));
  if (missing.length || extra.length) {
    ok = false;
    console.error(`✖ ${file}`);
    missing.forEach((k) => console.error(`  missing: ${k}`));
    extra.forEach((k) => console.error(`  extra:   ${k}`));
  } else {
    console.log(`✔ ${file}: ${keys.size} keys`);
  }
}
process.exit(ok ? 0 : 1);
