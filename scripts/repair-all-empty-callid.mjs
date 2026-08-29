import { readFileSync, readdirSync, existsSync, copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { zstdDecompressSync, zstdCompressSync, constants } from 'node:zlib';
import { basename, dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

function readZstd(path) {
  const buf = readFileSync(path);
  const ZSTD_MAGIC = 4247762216; const frames = []; let o = 0;
  while (o < buf.length) {
    o += 4; const d = buf[o]; o += 1; const csf = d >>> 6; const sg = (d & 32) !== 0; const ck = (d & 4) !== 0; const df = d & 3;
    const db = df === 3 ? 4 : df; const cb = csf === 0 ? (sg ? 1 : 0) : (1 << csf); o += (sg ? 0 : 1) + db + cb;
    for (;;) { if (buf.length - o < 3) throw new Error('torn'); const bh = buf.readUIntLE(o, 3); o += 3; const lb = (bh & 1) !== 0; const bt = (bh >>> 1) & 3; const bs = bh >>> 3; if (bt === 3) throw new Error('reserved'); const pb = bt === 1 ? 1 : bs; if (buf.length - o < pb) throw new Error('torn'); o += pb; if (lb) break; }
    if (ck) o += 4; frames.push(o);
  }
  let t = ''; let start = 0; for (const e of frames) { t += zstdDecompressSync(buf.subarray(start, e)).toString('utf8'); start = e; }
  return t;
}
function writeZstd(text, path) {
  const lines = text.split('\n');
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  const CHECKSUM = { params: { [constants.ZSTD_c_checksumFlag]: 1 } };
  const outFrames = [];
  outFrames.push(zstdCompressSync(Buffer.from(lines[0] + '\n', 'utf8'), CHECKSUM));
  let group = []; let groupBytes = 0; const GROUP_TARGET = 512 * 1024;
  for (let i = 1; i < lines.length; i++) {
    const b = Buffer.byteLength(lines[i]) + 1;
    if (groupBytes + b > GROUP_TARGET && group.length > 0) { outFrames.push(zstdCompressSync(Buffer.from(group.join('\n') + '\n', 'utf8'), CHECKSUM)); group = []; groupBytes = 0; }
    group.push(lines[i]); groupBytes += b;
  }
  if (group.length) outFrames.push(zstdCompressSync(Buffer.from(group.join('\n') + '\n', 'utf8'), CHECKSUM));
  writeFileSync(path, Buffer.concat(outFrames));
}
function countEmpty(lines) {
  let n = 0;
  for (let i = 1; i < lines.length; i++) { const ev = JSON.parse(lines[i]);
    if (ev.type === 'tool/result') { const s = ev.data?.message?.source; if (!s || s.kind !== 'tool' || !s.callId) n++; }
    else if (ev.type === 'tool/call' && !ev.data?.callId) n++;
  }
  return n;
}
function repairLines(lines) {
  let fixedChains = 0, fixedFields = 0;
  for (let i = 1; i < lines.length; i++) {
    const ev = JSON.parse(lines[i]);
    if (ev.type === 'tool/call' && (!ev.data?.callId || ev.data.callId === '')) {
      const uuid = randomUUID();
      ev.data.callId = uuid;
      if (!ev.data.name) ev.data.name = 'shell';
      lines[i] = JSON.stringify(ev); fixedFields++;
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const er = JSON.parse(lines[j]);
        if (er.type === 'tool/result') {
          const s = er.data?.message?.source; const block = er.data?.message?.content?.[0];
          if (!s || s.kind !== 'tool' || !s.callId || s.callId === '' || !block || block.toolCallId === '') {
            if (s) { s.kind = 'tool'; s.callId = uuid; } if (block) block.toolCallId = uuid;
            lines[j] = JSON.stringify(er); fixedFields++;
          }
          break;
        }
      }
      fixedChains++;
    }
  }
  return { fixedChains, fixedFields };
}

const base = "E:\\work\\dsh-desktop-me\\data\\sessions";
let repaired = 0, skipped = 0;
for (const ws of readdirSync(base, { withFileTypes: true }).filter(d => d.isDirectory())) {
  const dir = `${base}\\${ws.name}`;
  for (const sess of readdirSync(dir, { withFileTypes: true }).filter(d => d.isDirectory())) {
    const f = `${dir}\\${sess.name}\\session.jsonl.zstd`;
    if (!existsSync(f)) continue;
    let text; try { text = readZstd(f); } catch { continue; }
    const lines = text.split('\n').filter(x => x.trim());
    const before = countEmpty(lines);
    if (before === 0) continue;
    const { fixedChains, fixedFields } = repairLines(lines);
    const out = lines.join('\n') + '\n';
    const after = countEmpty(lines);
    const backupDir = join(dir, sess.name, 'backups'); mkdirSync(backupDir, { recursive: true });
    copyFileSync(f, join(backupDir, `${basename(f)}-${Date.now()}.bak`));
    writeZstd(out, f);
    repaired++;
    console.log(`REPAIRED ${ws.name}/${sess.name}  chains=${fixedChains} fields=${fixedFields} before=${before} after=${after}`);
  }
}
console.log(`\nDone. sessions repaired: ${repaired}`);
