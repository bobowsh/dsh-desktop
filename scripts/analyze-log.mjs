// Faithful structural analysis of a multi-frame .jsonl.zstd session log.
// Replicates decodeStorageRecord expansion + SessionLogScanner seq-continuity rule.
// usage: node analyze-log.mjs <file>
import { readFileSync } from 'node:fs';
import { zstdDecompressSync } from 'node:zlib';

const [file] = process.argv.slice(2);
const buf = readFileSync(file);
let starts = [];
for (let i = 0; i + 4 <= buf.length; i++) {
  if (buf[i] === 0x28 && buf[i + 1] === 0xb5 && buf[i + 2] === 0x2f && buf[i + 3] === 0xfd) starts.push(i);
}
let text = '';
for (let k = 0; k < starts.length; k++) {
  const end = k + 1 < starts.length ? starts[k + 1] : buf.length;
  try { text += zstdDecompressSync(buf.subarray(starts[k], end)).toString('utf8'); }
  catch (e) { console.error(`frame ${k} decompress failed: ${e.message}`); }
}
const lines = text.split('\n');
// drop trailing empty line(s) from split
while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
console.log(`total lines (incl header): ${lines.length}, frames: ${starts.length}`);
console.log(`HEADER: ${lines[0].slice(0, 400)}`);

// per-line seq range
const ranges = []; // {line, lo, hi, type, len}
let bad = 0;
for (let i = 1; i < lines.length; i++) {
  let ev;
  try { ev = JSON.parse(lines[i]); }
  catch { console.log(`line ${i + 1}: UNPARSEABLE :: ${lines[i].slice(0, 120)}`); bad++; ranges.push({ line: i + 1, lo: -1, hi: -1, type: 'UNPARSEABLE', len: 0 }); continue; }
  if (ev && (ev.type === 'text-chunks' || ev.type === 'reasoning-chunks' || ev.type === 'tool-call-chunks')) {
    const payload = ev.type === 'tool-call-chunks' ? ev.data.args : ev.data.texts;
    ranges.push({ line: i + 1, lo: ev.seq0, hi: ev.seq0 + payload.length - 1, type: ev.type, len: payload.length });
  } else if (ev && typeof ev.seq === 'number') {
    ranges.push({ line: i + 1, lo: ev.seq, hi: ev.seq, type: ev.type, len: 1 });
  } else {
    console.log(`line ${i + 1}: NO-SEQ type=${ev && ev.type} :: ${lines[i].slice(0, 120)}`);
    bad++; ranges.push({ line: i + 1, lo: -1, hi: -1, type: String(ev && ev.type), len: 0 });
  }
}

// continuity walk (expected = count of events so far)
let expected = 0;
const jumps = [];
for (const r of ranges) {
  if (r.lo < 0) continue;
  if (r.lo !== expected) {
    jumps.push({ line: r.line, expected, got: r.lo, kind: r.lo > expected ? `GAP +${r.lo - expected}` : `BACKWARD ${r.lo - expected}`, type: r.type });
    expected = r.lo; // resync to observe the rest
  }
  expected = r.hi + 1;
}
console.log(`\ntotal expanded events (if fully resynced): ${expected}; true discontinuities: ${jumps.length}`);
for (const j of jumps) console.log(`  line ${j.line}: expected ${j.expected}, got ${j.got} (${j.kind}) type=${j.type}`);

// For each backward jump, find the earlier lines covering the duplicated seq range
for (const j of jumps.filter(j => j.kind.startsWith('BACKWARD'))) {
  const dupLo = j.got, dupHi = j.expected - 1;
  console.log(`\n=== backward jump at line ${j.line}: duplicated seq range [${dupLo}..${dupHi}] (${dupHi - dupLo + 1} events) ===`);
  console.log('--- earlier (head) lines covering that range:');
  for (const r of ranges) {
    if (r.line >= j.line) break;
    if (r.hi >= dupLo && r.lo <= dupHi) console.log(`   head line ${r.line}: seq[${r.lo}..${r.hi}] type=${r.type}${r.len > 1 ? ' len=' + r.len : ''}`);
  }
  console.log('--- tail lines starting the rewrite:');
  let shown = 0;
  for (const r of ranges) {
    if (r.line < j.line) continue;
    if (shown++ >= 5) break;
    console.log(`   tail line ${r.line}: seq[${r.lo}..${r.hi}] type=${r.type}${r.len > 1 ? ' len=' + r.len : ''}`);
  }
  // last head line fully before dupLo (cut candidate)
  let cut = null;
  for (const r of ranges) {
    if (r.line >= j.line) break;
    if (r.hi < dupLo) cut = r; else break;
  }
  console.log(`--- cut candidate: last head line fully before seq ${dupLo}: line ${cut ? cut.line : '?'} seq[${cut ? cut.lo : ''}..${cut ? cut.hi : ''}] type=${cut ? cut.type : ''}`);
  const straddle = ranges.find(r => r.line < j.line && r.lo < dupLo && r.hi >= dupLo);
  if (straddle) console.log(`--- WARNING straddling line: head line ${straddle.line} seq[${straddle.lo}..${straddle.hi}] type=${straddle.type} crosses the cut`);
  else console.log('--- no straddling line: cut is line-aligned');
}
if (bad) console.log(`\nunparseable/no-seq lines: ${bad}`);
