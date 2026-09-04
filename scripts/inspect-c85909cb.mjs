// Inspect session log for validation failures (read-only, dumps offending events).
// usage: node inspect-c85909cb.mjs <file> [--all]
import { readFileSync } from 'node:fs';
import { zstdDecompressSync } from 'node:zlib';

const [file, allFlag] = process.argv.slice(2);
if (!file) { console.error('usage: node inspect-c85909cb.mjs <file> [--all]'); process.exit(2); }
const buf = readFileSync(file);

const ZSTD_MAGIC = 4247762216; const frames = []; let offset = 0;
while (offset < buf.length) {
  const start = offset;
  if (buf.length - offset < 4) throw new Error(`torn tail at ${start}`);
  if (buf.readUInt32LE(offset) !== ZSTD_MAGIC) throw new Error(`bad magic at ${offset}`);
  offset += 4;
  const descriptor = buf.readUInt8(offset); offset += 1;
  if ((descriptor & 24) !== 0) throw new Error(`reserved frame-header bit`);
  const contentSizeFlag = descriptor >>> 6;
  const singleSegment = (descriptor & 32) !== 0;
  const checksum = (descriptor & 4) !== 0;
  const dictionaryFlag = descriptor & 3;
  const dictionaryBytes = dictionaryFlag === 3 ? 4 : dictionaryFlag;
  const contentSizeBytes = contentSizeFlag === 0 ? (singleSegment ? 1 : 0) : (1 << contentSizeFlag);
  offset += (singleSegment ? 0 : 1) + dictionaryBytes + contentSizeBytes;
  for (;;) {
    if (buf.length - offset < 3) throw new Error(`torn block header`);
    const blockHeader = buf.readUIntLE(offset, 3); offset += 3;
    const lastBlock = (blockHeader & 1) !== 0;
    const blockType = (blockHeader >>> 1) & 3;
    const blockSize = blockHeader >>> 3;
    if (blockType === 3) throw new Error(`reserved block type`);
    const payloadBytes = blockType === 1 ? 1 : blockSize;
    if (buf.length - offset < payloadBytes) throw new Error(`torn block`);
    offset += payloadBytes;
    if (lastBlock) break;
  }
  if (checksum) offset += 4;
  frames.push({ start, end: offset });
}
console.log(`frames: ${frames.length}, file bytes: ${buf.length}`);
let text = '';
for (const f of frames) text += zstdDecompressSync(buf.subarray(f.start, f.end)).toString('utf8');
const lines = text.split('\n').filter(x => x.trim());
console.log(`plaintext lines: ${lines.length}`);

const bad = [];
for (let i = 1; i < lines.length; i++) {
  let ev; try { ev = JSON.parse(lines[i]); } catch (e) { bad.push({ seq: i, why: 'unparseable json: ' + e.message }); continue; }
  if (ev.type !== 'tool/result') continue;
  const s = ev.data?.message?.source;
  const block = ev.data?.message?.content?.[0];
  const ok = s && s.kind === 'tool' && typeof s.callId === 'string' && s.callId !== ''
    && block && block.type === 'tool-result' && Array.isArray(block.content)
    && block.toolCallId === s.callId;
  if (!ok) bad.push({ index: i, seq: ev.seq, type: ev.type, source: s, blockType: block?.type, toolCallId: block?.toolCallId, linePreview: lines[i].slice(0, 600) });
}
console.log(`bad tool/result events: ${bad.length}`);
for (const b of bad.slice(0, allFlag === '--all' ? bad.length : 10)) {
  console.log('---');
  console.log(JSON.stringify(b, null, 2));
}

// also check for tool/call with empty callId (the chain start)
const badCalls = [];
for (let i = 1; i < lines.length; i++) {
  const ev = JSON.parse(lines[i]);
  if (ev.type === 'tool/call' && (!ev.data?.callId || ev.data.callId === '')) {
    badCalls.push({ index: i, seq: ev.seq, name: ev.data?.name, surfaceOp: ev.surfaceOp, linePreview: lines[i].slice(0, 400) });
  }
}
console.log(`empty-callId tool/call events: ${badCalls.length}`);
for (const b of badCalls.slice(0, 10)) { console.log('---'); console.log(JSON.stringify(b, null, 2)); }
