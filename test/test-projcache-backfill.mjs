// Integration test for the patched SessionProjectionCache startup backfill.
// Runs the REAL patched service + real registry + real JSONL persistence
// against a COPY of the live sessions tree, with a Map-backed storageDomain
// mock. Proves: cold sessions without cache records get refolded titles
// written back by backfillColdSessions().
import { Context } from '@deepseek-ai/cordis';
import { SessionProjectionRegistry } from '@deepseek-ai/dsh-session-projection';
import { JsonlSessionPersistence } from '@deepseek-ai/dsh-session-persistence-jsonl';
import SessionProjectionCache from '@deepseek-ai/dsh-session-projection-cache';
import { z } from 'zod';
import fs from 'node:fs';

const sessionsRoot = process.argv[2]; // copy of data/sessions
const outFile = process.argv[3];      // where the mock domain dumps its table
if (!sessionsRoot || !outFile) { console.error('usage: test-projcache-backfill.mjs <sessionsRoot> <outFile>'); process.exit(2); }

// Map-backed storageDomain mock honoring the domain/table contract used by the cache.
function mockStorageDomain() {
  const tables = new Map();
  return {
    async open(spec) {
      const name = spec.name;
      return {
        table(tableName) {
          const key = `${name}/${tableName}`;
          if (!tables.has(key)) tables.set(key, new Map());
          const map = tables.get(key);
          return { get: (id) => map.get(id), async put(id, rec) { map.set(id, rec); } };
        },
        close() {},
      };
    },
    _dump() {
      const out = {};
      for (const [k, map] of tables) out[k] = Object.fromEntries(map);
      return out;
    },
  };
}

const app = new Context();
const domain = mockStorageDomain();
app.provide('storageDomain', domain);
app.provide('sessions', { get: () => undefined, list: () => [], async flush() {} });
await app.plugin(SessionProjectionRegistry);
await app.plugin(JsonlSessionPersistence, { root: sessionsRoot, compression: 'zstd' });

// The title unit, identical to dsh-session-title's registration.
app.sessionProjections.register({
  key: 'title',
  schema: z.union([z.string().min(1), z.null()]),
  init: () => null,
  apply: (state, event) => (event.type === 'session/title' ? event.data.title : state),
  view: (state) => state,
  stateVersion: 1,
});

await app.plugin(SessionProjectionCache, { writeEveryEvents: 200, writeIntervalMs: 5000 });

// Wait for the async backfill to quiesce (table size stable across polls).
let last = -1, stable = 0;
for (;;) {
  await new Promise((r) => setTimeout(r, 500));
  const size = domain._dump()['session_projcache/sessions'] ? Object.keys(domain._dump()['session_projcache/sessions']).length : 0;
  if (size === last) { stable++; if (stable >= 3) break; } else { stable = 0; last = size; }
}
const records = domain._dump()['session_projcache/sessions'] ?? {};
fs.writeFileSync(outFile, JSON.stringify(records, null, 1));
console.log('backfilled records:', Object.keys(records).length);
for (const [id, rec] of Object.entries(records)) {
  const t = rec.rows?.title;
  console.log(id.slice(0, 40).padEnd(42), 'title=', t ? JSON.stringify(t.val).slice(0, 50) : '(no title row)', 'identity=', JSON.stringify(rec.identity));
}
process.exit(0);
