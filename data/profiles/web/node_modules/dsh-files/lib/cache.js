// Bounded LRU cache for parsed document text. Keys are the fs target key plus
// the observed file version, so an edited file never serves stale text while
// unchanged files are parsed at most once per process.
//
// Budget is enforced on BOTH entry count and total bytes: a 24 MiB PDF can
// yield several MiB of extracted text, so a pure entry-count cap lets memory
// balloon. `maxBytes` bounds the estimated retained size (2 bytes per char).
export class ParseCache {
    map = new Map();
    maxEntries;
    maxBytes;
    bytes = 0;
    constructor(maxEntries, maxBytes = 64 * 1024 * 1024) {
        if (!Number.isInteger(maxEntries) || maxEntries < 1) {
            throw new Error(`ParseCache: maxEntries must be a positive integer, got ${maxEntries}`);
        }
        if (!Number.isInteger(maxBytes) || maxBytes < 1) {
            throw new Error(`ParseCache: maxBytes must be a positive integer, got ${maxBytes}`);
        }
        this.maxEntries = maxEntries;
        this.maxBytes = maxBytes;
    }
    get(key) {
        const k = this.keyOf(key);
        const hit = this.map.get(k);
        if (hit !== undefined) {
            // Refresh recency.
            this.map.delete(k);
            this.map.set(k, hit);
        }
        return hit;
    }
    set(key, text) {
        const k = this.keyOf(key);
        if (this.map.has(k)) {
            this.bytes -= this.sizeOf(this.map.get(k));
            this.map.delete(k);
        }
        const size = this.sizeOf(text);
        this.map.set(k, text);
        this.bytes += size;
        // Evict by count first, then by byte budget (oldest first).
        while ((this.map.size > this.maxEntries || this.bytes > this.maxBytes) && this.map.size > 0) {
            const oldest = this.map.keys().next().value;
            if (oldest === undefined)
                break;
            const evicted = this.map.get(oldest);
            this.bytes -= this.sizeOf(evicted);
            this.map.delete(oldest);
        }
    }
    clear() {
        this.map.clear();
        this.bytes = 0;
    }
    get size() {
        return this.map.size;
    }
    get totalBytes() {
        return this.bytes;
    }
    /** Estimated retained bytes; strings are UTF-16 internally (2 bytes/char). */
    sizeOf(text) {
        return text.length * 2;
    }
    keyOf(key) {
        return `${key.targetKey}\u0000${key.version}\u0000${key.format}\u0000${key.sheet ?? ''}\u0000${key.listSheets === true ? 'list' : ''}`;
    }
}
