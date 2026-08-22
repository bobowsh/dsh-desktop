// Compare the two divergent branches around the backward jump.
// usage: node diff-branches.mjs <file>
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
  try { text += zstdDecompressSync(buf.subarray(starts[k], end)).toString('utf8'); } catch {}
}
const lines = text.split('\n');
while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();

function summarize(line) {
  let ev; try { ev = JSON.parse(line); } catch { return 'UNPARSEABLE'; }
  const t = ev.type;
  const d = ev.data || {};
  let extra = '';
  if (t === 'user/message' || t === 'assistant/message') {
    const parts = (d.content || d.message?.content || []).map(c => c.type === 'text' ? c.text.slice(0, 90) : `<${c.type}>`);
    extra = ' :: ' + parts.join(' | ').replace(/\n/g, ' ');
  } else if (t === 'tool/call') {
    extra = ` :: ${d.name} ${String(d.arguments).slice(0, 80)}`;
  } else if (t === 'tool/result') {
    extra = ` :: callId=${d.message?.source?.callId ?? d.callId ?? '?'}`;
  } else if (t === 'turn/start' || t === 'turn/end' || t === 'step/start' || t === 'step/end') {
    extra = ` :: turn=${d.turn} step=${d.step ?? ''}`;
  }
  return `${t}${extra}`;
}

console.log('===== HEAD branch (lines 3998-4053, seq 18353-18408) =====');
for (let i = 3997; i < 4053; i++) console.log(`L${i + 1}: ${summarize(lines[i])}`);

console.log('\n===== TAIL branch start (lines 4054-4085) =====');
for (let i = 4053; i < Math.min(4085, lines.length); i++) console.log(`L${i + 1}: ${summarize(lines[i])}`);

// find tail's turn 12 start
console.log('\n===== TAIL: turn boundaries after jump =====');
let shown = 0;
for (let i = 4053; i < lines.length && shown < 40; i++) {
  let ev; try { ev = JSON.parse(lines[i]); } catch { continue; }
  if (ev.type === 'turn/start' || ev.type === 'turn/end' || ev.type === 'user/message') {
    const d = ev.data || {};
    let extra = '';
    if (ev.type === 'user/message') {
      const parts = (d.content || []).map(c => c.type === 'text' ? c.text.slice(0, 90) : `<${c.type}>`);
      extra = ' :: ' + parts.join(' | ').replace(/\n/g, ' ');
    }
    console.log(`L${i + 1}: seq=${ev.seq ?? ev.seq0} ${ev.type} turn=${d.turn ?? ''}${extra}`);
    shown++;
  }
}
