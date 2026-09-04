// Repair session-c85909cb-e7cd-4e69-9775-ba8643eab8ff:
//   seq 99914 tool/call has empty callId and empty name → produces
//   seq 99915 tool/result with empty source.callId, failing validation
//   "session event at seq 99915 message must have tool source".
//
// Fix: assign a fresh UUID to the callId, set a placeholder name,
// and propagate it through the matching tool/result source + block.
// Preserves all surrounding content.
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { zstdDecompressSync, zstdCompressSync, constants } from 'node:zlib';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

const FILE = "E:\\work\\dsh-desktop-me\\data\\sessions\\--E-work-dsh-desktop-me--\\session-c85909cb-e7cd-4e69-9775-ba8643eab8ff\\session.jsonl.zstd";
const BACKUP_DIR = join(dirname(FILE), "backups");

// 1. decompress
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
console.log(`plaintext lines: ${lines.length}`);

// 2. repair the empty-callId chain (single chain at seq 99914)
const uuid = randomUUID();
const NAME_PLACEHOLDER = 'shell';
let fixedChains = 0, fixedFields = 0;
for (let i = 1; i < lines.length; i++) {
  const ev = JSON.parse(lines[i]);
  if (ev.type === 'tool/call' && (!ev.data?.callId || ev.data.callId === '')) {
    ev.data.callId = uuid;
    if (!ev.data.name) ev.data.name = NAME_PLACEHOLDER;
    lines[i] = JSON.stringify(ev);
    fixedFields++;
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      const er = JSON.parse(lines[j]);
      if (er.type === 'tool/result') {
        const s = er.data?.message?.source;
        const block = er.data?.message?.content?.[0];
        if (!s || s.kind !== 'tool' || !s.callId || s.callId === '') {
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

// 3. write backup + repaired log
mkdirSync(BACKUP_DIR, { recursive: true });
const backupPath = join(BACKUP_DIR, `session.jsonl.zstd-${Date.now()}.bak`);
copyFileSync(FILE, backupPath);
console.log(`backup written: ${backupPath}`);

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
writeFileSync(FILE, out);
console.log(`repaired log written: ${FILE} (${out.length} bytes)`);
