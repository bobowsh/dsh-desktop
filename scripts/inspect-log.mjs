// Inspect a multi-frame .jsonl.zstd session log around a given line/seq.
// usage: node inspect-log.mjs <file> <centerLine> <radius> [grepSeq]
import { readFileSync } from 'node:fs';
import { zstdDecompressSync } from 'node:zlib';

const [file, centerLineArg, radiusArg, grepSeq] = process.argv.slice(2);
const buf = readFileSync(file);
const MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);
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

if (grepSeq !== undefined) {
  const target = Number(grepSeq);
  for (let i = 0; i < lines.length; i++) {
    try {
      const ev = JSON.parse(lines[i]);
      if (ev.seq !== undefined && Math.abs(ev.seq - target) <= 3) {
        console.log(`--- line ${i + 1} seq=${ev.seq} type=${ev.type}`);
        console.log(lines[i].slice(0, 1200));
      }
    } catch { console.log(`--- line ${i + 1} UNPARSEABLE: ${lines[i].slice(0, 300)}`); }
  }
} else {
  const c = Number(centerLineArg), r = Number(radiusArg);
  for (let i = Math.max(0, c - 1 - r); i < Math.min(lines.length, c + r); i++) {
    let seq = '?', type = '?';
    try { const ev = JSON.parse(lines[i]); seq = ev.seq; type = ev.type; }
    catch { type = 'UNPARSEABLE'; }
    console.log(`line ${i + 1}: seq=${seq} type=${type} :: ${lines[i].slice(0, 260)}`);
  }
}
