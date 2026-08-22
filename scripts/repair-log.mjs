// Repair session-2e2c8dfb log: remove the stale duplicate branch (head lines 3998-4053, seq 18353-18408)
// so the surviving tail rewrite (line 4054+, seq 18353+) continues the log contiguously.
// Frame layout rules (from dsh-session-persistence-jsonl):
//   - frame 0 plaintext must be EXACTLY the header line + '\n'
//   - every complete frame must end at a line boundary (no mid-line frame end)
//   - frames are independently decodable, checksummed (ZSTD_c_checksumFlag=1)
// usage: node repair-log.mjs <file> <outFile> [--apply]
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { zstdDecompressSync, zstdCompressSync, constants } from 'node:zlib';
import { basename, dirname, join } from 'node:path';

const [file, outFile, applyFlag] = process.argv.slice(2);
const buf = readFileSync(file);

// --- structural frame walk (mirrors scanZstdFrames) ---
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

// --- per-line seq ranges (replicating decodeStorageRecord expansion) ---
function rangeOf(line) {
  const ev = JSON.parse(line);
  if (ev && (ev.type === 'text-chunks' || ev.type === 'reasoning-chunks' || ev.type === 'tool-call-chunks')) {
    const payload = ev.type === 'tool-call-chunks' ? ev.data.args : ev.data.texts;
    return { lo: ev.seq0, hi: ev.seq0 + payload.length - 1, type: ev.type };
  }
  if (ev && typeof ev.seq === 'number') return { lo: ev.seq, hi: ev.seq, type: ev.type };
  throw new Error(`line without seq: ${line.slice(0, 120)}`);
}

const CUT_KEEP_HEAD_LINES = 3997;   // keep lines[0..3996] (header + seq 0..18352)
const TAIL_START_LINE = 4054;       // keep lines[4053..]    (seq 18353..24503)

// sanity checks before cutting
const headLast = rangeOf(lines[CUT_KEEP_HEAD_LINES - 1]); // 1-indexed line 3997
const tailFirst = rangeOf(lines[TAIL_START_LINE - 1]);    // 1-indexed line 4054
if (headLast.hi !== 18352) throw new Error(`head cut mismatch: last kept seq ${headLast.hi}, expected 18352`);
if (tailFirst.lo !== 18353) throw new Error(`tail start mismatch: first tail seq ${tailFirst.lo}, expected 18353`);
console.log(`cut verified: head ends seq ${headLast.hi} (${headLast.type}), tail starts seq ${tailFirst.lo} (${tailFirst.type})`);

const kept = [...lines.slice(0, CUT_KEEP_HEAD_LINES), ...lines.slice(TAIL_START_LINE - 1)];
console.log(`kept lines: ${kept.length} (dropped ${lines.length - kept.length})`);

// --- full continuity simulation over the rebuilt event stream ---
let expected = 0;
for (let i = 1; i < kept.length; i++) {
  const r = rangeOf(kept[i]);
  if (r.lo !== expected) throw new Error(`rebuilt stream discontinuity at kept line ${i + 1}: expected ${expected}, got ${r.lo}`);
  expected = r.hi + 1;
}
console.log(`rebuilt stream OK: ${expected} events, seqs 0..${expected - 1} contiguous`);

// --- reframe: frame 0 = header only; then ~512KB plaintext groups, line-aligned ---
const CHECKSUM = { params: { [constants.ZSTD_c_checksumFlag]: 1 } };
const outFrames = [];
outFrames.push(zstdCompressSync(Buffer.from(kept[0] + '\n', 'utf8'), CHECKSUM));
let group = [];
let groupBytes = 0;
const GROUP_TARGET = 512 * 1024;
for (let i = 1; i < kept.length; i++) {
  const b = Buffer.byteLength(kept[i]) + 1;
  if (groupBytes + b > GROUP_TARGET && group.length > 0) {
    outFrames.push(zstdCompressSync(Buffer.from(group.join('\n') + '\n', 'utf8'), CHECKSUM));
    group = []; groupBytes = 0;
  }
  group.push(kept[i]); groupBytes += b;
}
if (group.length) outFrames.push(zstdCompressSync(Buffer.from(group.join('\n') + '\n', 'utf8'), CHECKSUM));
const out = Buffer.concat(outFrames);
console.log(`output: ${outFrames.length} frames, ${out.length} bytes`);

if (applyFlag === '--apply') {
  const backupDir = join(dirname(dirname(dirname(file))), 'backups');
  mkdirSync(backupDir, { recursive: true });
  const backup = join(backupDir, `session-2e2c8dfb-${Date.now()}.jsonl.zstd`);
  copyFileSync(file, backup);
  console.log(`backup written: ${backup}`);
  writeFileSync(outFile, out);
  console.log(`repaired log written: ${outFile}`);
} else {
  console.log('dry-run only (pass --apply to write)');
}
