// Plain-text decoding: BOM-aware UTF-16, then UTF-8 (fatal), then GB18030
// (fatal) as a Chinese-scenario fallback. Returns null when no encoding in
// the chain decodes cleanly, so callers can reject instead of emitting
// replacement characters.
function tryDecode(bytes, encoding, stripBom) {
    try {
        const text = new TextDecoder(encoding, { fatal: true }).decode(bytes);
        return stripBom ? text.replace(/^\uFEFF/, '') : text;
    }
    catch {
        return null;
    }
}
export function decodeText(bytes) {
    if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
        return new TextDecoder('utf-16le', { fatal: true }).decode(bytes.subarray(2));
    }
    if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
        return new TextDecoder('utf-16be', { fatal: true }).decode(bytes.subarray(2));
    }
    return tryDecode(bytes, 'utf-8', true) ?? tryDecode(bytes, 'gb18030', false);
}
/** Split decoded text into 1-based line windows without a trailing phantom line. */
export function windowLines(text, offset, limit, maxChars = Infinity) {
    // CRLF 文本每行残留的 \r 会在行号输出里脏化模型看到的文本。
    const normalized = text.replace(/\r\n/g, '\n');
    const endsWithNewline = normalized.endsWith('\n');
    const all = normalized.split('\n');
    if (endsWithNewline && all.length > 0)
        all.pop();
    const totalLines = all.length;
    const start = Math.max(0, offset - 1);
    const end = Math.min(totalLines, start + limit);
    const lines = [];
    let budget = maxChars;
    for (let i = start; i < end; i++) {
        const raw = all[i];
        // 总字符预算：窗口累计超限就停，防止 2000 行 × 长行撑爆上下文。
        // 单行超长也按剩余预算截断并显式标记。
        if (raw.length > budget) {
            lines.push({
                number: i + 1,
                text: `${raw.slice(0, Math.max(0, budget))}…[truncated, ${raw.length} chars]`
            });
            break;
        }
        lines.push({ number: i + 1, text: raw });
        budget -= raw.length;
    }
    const shown = lines.length;
    const hidden = end - start - shown;
    if (hidden > 0 && lines.length > 0) {
        lines[lines.length - 1] = {
            ...lines[lines.length - 1],
            text: `${lines[lines.length - 1].text}\n…[${hidden} more lines not shown — character budget reached; use offset/limit to page]`
        };
    }
    return { totalLines, lines };
}
