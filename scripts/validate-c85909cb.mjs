// Validate the repaired session-c85909cb log against dsh-session.
// Strategy: replicate the constructor's per-event validation on
// the contiguous prefix only (skip reasoning-chunks etc. which
// have no seq and aren't validated by the seed-path).
import { readFileSync } from 'node:fs';
import { zstdDecompressSync } from 'node:zlib';
import { createRequire } from 'node:module';

const FILE = "E:\\work\\dsh-desktop-me\\data\\sessions\\--E-work-dsh-desktop-me--\\session-c85909cb-e7cd-4e69-9775-ba8643eab8ff\\session.jsonl.zstd";
const require = createRequire(import.meta.url);
const { Session } = require('E:\\work\\dsh-desktop-me\\data\\profiles\\web\\node_modules\\@deepseek-ai\\dsh-session\\lib\\index.js');

const buf = readFileSync(FILE);
const ZSTD_MAGIC = 4247762216; const frames = []; let offset = 0;
while (offset < buf.length) {
  const start = offset;
  if (buf.length - offset < 4) throw new Error('torn tail');
  if (buf.readUInt32LE(offset) !== ZSTD_MAGIC) throw new Error('bad magic');
  offset += 4;
  const descriptor = buf.readUInt8(offset); offset += 1;
  if ((descriptor & 24) !== 0) throw new Error('reserved bit');
  const contentSizeFlag = descriptor >>> 6;
  const singleSegment = (descriptor & 32) !== 0;
  const checksum = (descriptor & 4) !== 0;
  const dictionaryFlag = descriptor & 3;
  const dictionaryBytes = dictionaryFlag === 3 ? 4 : dictionaryFlag;
  const contentSizeBytes = contentSizeFlag === 0 ? (singleSegment ? 1 : 0) : (1 << contentSizeFlag);
  offset += (singleSegment ? 0 : 1) + dictionaryBytes + contentSizeBytes;
  for (;;) {
    if (buf.length - offset < 3) throw new Error('torn block');
    const bh = buf.readUIntLE(offset, 3); offset += 3;
    const lb = (bh & 1) !== 0; const bt = (bh >>> 1) & 3; const bs = bh >>> 3;
    if (bt === 3) throw new Error('reserved');
    const pb = bt === 1 ? 1 : bs;
    if (buf.length - offset < pb) throw new Error('torn');
    offset += pb;
    if (lb) break;
  }
  if (checksum) offset += 4;
  frames.push({ start, end: offset });
}
let text = '';
for (const f of frames) text += zstdDecompressSync(buf.subarray(f.start, f.end)).toString('utf8');
const lines = text.split('\n').filter(x => x.trim());
const events = lines.map(l => JSON.parse(l));

// The "session" envelope event (index 0) is not part of the seed.
// Contiguous seed starts at index 1 with seq=0 (permission/preset).
// Find where seq === index-1 breaks (because we dropped index 0).
let seedEnd = -1;
for (let i = 1; i < events.length; i++) {
  if (events[i].seq === i - 1) seedEnd = i;
  else break;
}
console.log(`contiguous seed: indices 1..${seedEnd}`);

// Build seed: drop index 0, take the contiguous prefix
const seed = events.slice(1, seedEnd + 1);
console.log(`seed length: ${seed.length}, last seq: ${seed[seed.length - 1]?.seq}`);

// The constructor for non-restore mode deep-freezes each event.
// But our seed may contain extra events that would fail deeper checks.
// However, the constructor does a shallow check per event (envelope
// + per-type shape), then deep-freezes. Let's just run the
// constructor — it'll validate each event in turn.
// We need to handle the fact that the constructor iterates seed
// and checks snapshot.seq === index. Since our seed is already
// contiguous (seed[i].seq === i), it'll accept the whole prefix.
try {
  const session = Session.create('session-c85909cb-e7cd-4e69-9775-ba8643eab8ff', seed);
  console.log(`Session created OK. log length: ${session.log.length}`);
  console.log('VALIDATION PASSED');
} catch (err) {
  console.error('\nVALIDATION FAILED:', err.message);
  const idx = err.message.match(/index (\d+)/);
  if (idx) {
    const i = parseInt(idx[1]);
    console.error('offending seed event:', JSON.stringify(seed[i]).slice(0, 500));
  }
  const seqMatch = err.message.match(/seq (\d+)/);
  if (seqMatch) {
    const targetSeq = parseInt(seqMatch[1]);
    const ev = seed.find(e => e.seq === targetSeq);
    if (ev) console.error('event at target seq:', JSON.stringify(ev).slice(0, 500));
  }
  process.exit(1);
}
