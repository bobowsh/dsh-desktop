// Repair session logs containing empty-callId tool chains (tool/call + tool/result
// pairs where callId === "" and name === ""). This is the generic "empty tool
// source" corruption (same class as session-8ede3511 seq 123-125): a tool was
// invoked but its id/name were dropped, so tool/result fails
// assertMessageEventShape ("message must have tool source").
//
// Fix: for every broken chain, assign ONE fresh UUID across the whole chain
// (tool/call.callId + tool/call.name placeholder, tool/result source.callId +
// tool-result block.toolCallId). This makes the chain internally consistent and
// passes validation while preserving all surrounding conversation content.
//
// usage: node repair-4c6e.mjs <file> <outFile> [--apply]
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { zstdDecompressSync, zstdCompressSync, constants } from 'node:zlib';
import { basename, dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

const [file, outFile, applyFlag] = process.argv.slice(2);
if (!file || !outFile) { console.error('usage: node repair-4c6e.mjs <file> <outFile> [--apply]'); process.exit(2); }
const buf = readFileSync(file);

const ZSTD_MAGIC = 4247762216; const frames = []; let offset = 0;
while (offset < buf.length) {
  const start = offset;
  if (buf.length - offset < 4) throw new Error(`torn tail at ${start}`);
  if (buf.readUInt32LE(offset) !== ZSTD_MAGIC) throw new Error(`bad magic at ${offset}`);
  offset += 4;
  const descriptor = buf.readUInt8(offset); offset += 1;
  if ((descriptor & 24) !== 0) throw new Error(`reserved frame-header bit at ${offset - 1}`);
  const contentSizeFlag = descriptor >>> 6;
  const singleSegment = (descriptor & 32) !== 0;
  const checksum = (descriptor & 4) !== 0;
  const dictionaryFlag = descriptor & 3;
  const dictionaryBytes = dictionaryFlag === 3 ? 4 : dictionaryFlag;
  const contentSizeBytes = contentSizeFlag === 0 ? (singleSegment ? 1 : 0) : (1 << contentSizeFlag);
  offset += (singleSegment ? 0 : 1) + dictionaryBytes + contentSizeBytes;
  for (;;) {
    if (buf.length - offset < 3) throw new Error(`torn block header at ${offset}`);
    const blockHeader = buf.readUIntLE(offset, 3); offset += 3;
    const lastBlock = (blockHeader & 1) !== 0;
    const blockType = (blockHeader >>> 1) & 3;
    const blockSize = blockHeader >>> 3;
    if (blockType === 3) throw new Error(`reserved block type at ${offset - 3}`);
    const payloadBytes = blockType === 1 ? 1 : blockSize;
    if (buf.length - offset < payloadBytes) throw new Error(`torn block at ${offset}`);
    offset += payloadBytes;
    if (lastBlock) break;
  }
  if (checksum) offset += 4;
  frames.push({ start, end: offset });
}
console.log(`frames: ${frames.length}, file bytes: ${buf.length}`);

let text = '';
for (const f of frames) text += zstdDecompressSync(buf.subarray(f.start, f.end)).toString('utf8');
const lines = text.split('\n');
while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
console.log(`plaintext lines: ${lines.length}`);

// --- repair empty-callId tool chains ---
let fixedChains = 0, fixedFields = 0;
const NAME_PLACEHOLDER = 'shell'; // args are shell commands; keeps chain consistent
for (let i = 1; i < lines.length; i++) {
  const ev = JSON.parse(lines[i]);
  if (ev.type === 'tool/call' && (!ev.data?.callId || ev.data.callId === '')) {
    const uuid = randomUUID();
    // fix tool/call
    ev.data.callId = uuid;
    if (!ev.data.name) ev.data.name = NAME_PLACEHOLDER;
    lines[i] = JSON.stringify(ev);
    fixedFields++;
    // find the matching tool/result right after (search forward a few lines)
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      const er = JSON.parse(lines[j]);
      if (er.type === 'tool/result') {
        const s = er.data?.message?.source;
        const block = er.data?.message?.content?.[0];
        if (!s || s.kind !== 'tool' || !s.callId || s.callId === '' || !block || block.toolCallId === '') {
          if (s) { s.kind = 'tool'; s.callId = uuid; }
          if (block) block.toolCallId = uuid;
          lines[j] = JSON.stringify(er);
          fixedFields++;
        }
        break;
      }
    }
    fixedChains++;
  }
}
console.log(`fixed chains: ${fixedChains}, fixed fields: ${fixedFields}`);

// --- reframe ---
const CHECKSUM = { params: { [constants.ZSTD_c_checksumFlag]: 1 } };
const outFrames = [];
outFrames.push(zstdCompressSync(Buffer.from(lines[0] + '\n', 'utf8'), CHECKSUM));
let group = []; let groupBytes = 0;
const GROUP_TARGET = 512 * 1024;
for (let i = 1; i < lines.length; i++) {
  const b = Buffer.byteLength(lines[i]) + 1;
  if (groupBytes + b > GROUP_TARGET && group.length > 0) {
    outFrames.push(zstdCompressSync(Buffer.from(group.join('\n') + '\n', 'utf8'), CHECKSUM));
    group = []; groupBytes = 0;
  }
  group.push(lines[i]); groupBytes += b;
}
if (group.length) outFrames.push(zstdCompressSync(Buffer.from(group.join('\n') + '\n', 'utf8'), CHECKSUM));
const out = Buffer.concat(outFrames);
console.log(`output: ${outFrames.length} frames, ${out.length} bytes`);

if (applyFlag === '--apply') {
  const backupDir = join(dirname(file), 'backups');
  mkdirSync(backupDir, { recursive: true });
  const backup = join(backupDir, `${basename(file)}-${Date.now()}.bak`);
  copyFileSync(file, backup);
  console.log(`backup written: ${backup}`);
  writeFileSync(outFile, out);
  console.log(`repaired log written: ${outFile}`);
} else {
  console.log('dry-run only (pass --apply to write)');
}
