/**
 * Registry access: fetch the curated list from awesome-dsh-plugin.com with an
 * in-memory cache, falling back to the bundled snapshot when offline.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
/**
 * Where the curated list comes from. Overridable through the process
 * environment ONLY — the layer-3 e2e points it at a local fixture catalog so
 * the install route can be driven end to end without publishing anything.
 *
 * This does not weaken the install route's registry check. That check exists
 * to stop a malicious PAGE from POSTing an arbitrary source at the local
 * server; a page cannot set environment variables, and anyone who can set
 * this process's environment already controls the process. What the override
 * changes is WHICH list is curated, never WHETHER the check runs.
 */
const REGISTRY_URL = process.env.DSHM_REGISTRY_URL ?? 'https://awesome-dsh-plugin.com/plugins.json';
const TTL_MS = 60 * 60 * 1000;
let cache = null;
function snapshot() {
    const path = fileURLToPath(new URL('../data/registry-snapshot.json', import.meta.url));
    return JSON.parse(readFileSync(path, 'utf8'));
}
export async function loadRegistry() {
    if (cache && Date.now() - cache.at < TTL_MS) {
        return { registry: cache.data, source: 'cache' };
    }
    try {
        const res = await fetch(REGISTRY_URL, { signal: AbortSignal.timeout(4000) });
        if (!res.ok)
            throw new Error(`HTTP ${res.status}`);
        const data = (await res.json());
        if (!Array.isArray(data.plugins) || data.plugins.length === 0)
            throw new Error('empty registry');
        cache = { at: Date.now(), data };
        return { registry: data, source: 'live' };
    }
    catch {
        return { registry: cache?.data ?? snapshot(), source: cache ? 'cache' : 'snapshot' };
    }
}
