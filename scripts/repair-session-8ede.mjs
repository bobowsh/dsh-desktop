// Repair session-8ede3511-...: seq 123/124/125 are a tool-call chain with empty
// callId (""). The tool/result at seq 125 fails assertMessageEventShape because
// its message.source.callId is empty. Fix by assigning one fresh UUID across the
// whole chain (assistant/message inner tool-call block id, tool/call.callId,
// tool/result.source.callId, tool/result block.toolCallId) and set the tool name.
//
// usage: node repair-session-8ede.mjs <file> <outFile> [--apply]
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { zstdDecompressSync, zstdCompressSync, constants } from 'node:zlib';
import { basename, dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

const [file, outFile, applyFlag] = process.argv.slice(2);
if (!file || !outFile) { console.error('usage: node repair-session-8ede.mjs <file> <outFile> [--apply]'); process.exit(2); }
const buf = readFileSync(file);

// --- structural frame walk ---
const ZSTD_MAGIC = 4247762216;
const frames = [];
let offset = 0;
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

// --- decode all frames ---
let text = '';
for (const f of frames) text += zstdDecompressSync(buf.subarray(f.start, f.end)).toString('utf8');
const lines = text.split('\n');
while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
console.log(`plaintext lines: ${lines.length}`);

// --- find corrupt tool-call chain (assistant/message -> tool/call -> tool/result) ---
// strategy: scan for tool/result with empty callId, pair with preceding tool/call (same step)
// and the assistant/message that carries an empty tool-call block.
const uuid = randomUUID();
const TOOL_NAME = 'sdd_start_pipeline';
let fixed = 0;

for (let i = 1; i < lines.length; i++) {
  const ev = JSON.parse(lines[i]);
  if (ev.type === 'tool/result' && ev.data?.message?.source?.callId === '') {
    // fix tool/result
    ev.data.message.source.callId = uuid;
    const block = ev.data.message.content?.[0];
    if (block && block.type === 'tool-result') block.toolCallId = uuid;
    lines[i] = JSON.stringify(ev);
    fixed++;
    // fix matching tool/call (search backward within nearby lines)
    for (let j = i - 1; j >= 1; j--) {
      const e2 = JSON.parse(lines[j]);
      if (e2.type === 'tool/call' && (e2.data?.callId === '' || e2.data?.callId === undefined)) {
        e2.data.callId = uuid;
        if (!e2.data.name) e2.data.name = TOOL_NAME;
        lines[j] = JSON.stringify(e2);
        fixed++;
        break;
      }
      if (e2.type === 'assistant/message') break; // stop before previous turn
    }
    // fix assistant/message inner tool-call block (search backward)
    for (let j = i - 1; j >= 1; j--) {
      const e2 = JSON.parse(lines[j]);
      if (e2.type === 'assistant/message') {
        const content = e2.data?.message?.content;
        if (Array.isArray(content)) {
          for (const c of content) {
            if (c && c.type === 'tool-call' && (c.id === '' || c.id === undefined)) {
              c.id = uuid;
              if (!c.name) c.name = TOOL_NAME;
              lines[j] = JSON.stringify(e2);
              fixed++;
              break;
            }
          }
        }
        break;
      }
    }
  }
}
console.log(`fixed fields: ${fixed}`);

// --- reframe: frame 0 = header only; then ~512KB plaintext groups, line-aligned ---
const CHECKSUM = { params: { [constants.ZSTD_c_checksumFlag]: 1 } };
const outFrames = [];
outFrames.push(zstdCompressSync(Buffer.from(lines[0] + '\n', 'utf8'), CHECKSUM));
let group = [];
let groupBytes = 0;
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
