// Scan a multi-frame .jsonl.zstd session log for seq discontinuities.
// usage: node scan-log.mjs <file>
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
const lines = text.split('\n').filter(l => l.trim().length > 0);
console.log(`total lines: ${lines.length}, frames: ${starts.length}`);

let prevEnd = -1, prevLine = 0;
let problems = 0;
for (let i = 0; i < lines.length; i++) {
  let ev;
  try { ev = JSON.parse(lines[i]); }
  catch { console.log(`line ${i + 1}: UNPARSEABLE :: ${lines[i].slice(0, 160)}`); problems++; continue; }
  let lo, hi;
  if (ev.type === 'text-chunks') {
    lo = ev.seq0; hi = ev.seq0 + (ev.data?.texts?.length ?? 1) - 1;
  } else if (typeof ev.seq === 'number') {
    lo = hi = ev.seq;
  } else {
    console.log(`line ${i + 1}: no seq field, type=${ev.type} :: ${lines[i].slice(0, 160)}`);
    problems++; continue;
  }
  if (prevEnd >= 0 && lo !== prevEnd + 1) {
    problems++;
    console.log(`DISCONTINUITY at line ${i + 1}: prev ended seq=${prevEnd} (line ${prevLine}), this starts seq=${lo} (${lo > prevEnd + 1 ? 'GAP +' + (lo - prevEnd - 1) : 'BACKWARD ' + (lo - prevEnd - 1)}) type=${ev.type} time=${ev.time ?? ev.time0}`);
  }
  prevEnd = hi; prevLine = i + 1;
}
console.log(`problems: ${problems}`);
console.log(`first seq / last seq coverage end: ${prevEnd}`);
