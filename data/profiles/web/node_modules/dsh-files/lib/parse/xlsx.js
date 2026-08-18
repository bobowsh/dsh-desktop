// XLSX cell text extraction via read-excel-file (read-only parser, no known
// advisories — replaces xlsx@0.18.5 which carries prototype-pollution CVEs).
// The parser streams the workbook internally; `sheetRowLimit` bounds the rows
// we keep for the model per sheet, and `maxSheets` bounds how many sheets are
// read. Truncation is reported explicitly so the model never mistakes a
// partial table for the whole workbook.
import readXlsxFile, { readSheetNames } from 'read-excel-file/node';
function cellText(value) {
    if (value === null || value === undefined)
        return '';
    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }
    return String(value);
}
function rowsToText(rows) {
    return rows.map((row) => row.map(cellText).join('\t').replace(/\s+$/, '')).join('\n');
}
export async function parseXlsx(bytes, options) {
    const maxSheets = options.maxSheets ?? 5;
    const buf = Buffer.from(bytes);
    const sheetNames = await readSheetNames(buf);
    const sheets = sheetNames.length > 0 ? sheetNames.slice(0, maxSheets) : [1];
    const parts = [];
    let totalRows = 0;
    let truncated = false;
    let sheetTruncated = false;
    for (const sheet of sheets) {
        const rows = await readXlsxFile(buf, { sheet });
        totalRows += rows.length;
        const kept = rows.slice(0, options.sheetRowLimit);
        if (rows.length > kept.length)
            sheetTruncated = true;
        parts.push(`### Sheet: ${String(sheet)}\n${rowsToText(kept)}`);
    }
    // 多 sheet 但被 maxSheets 截断
    if (sheetNames.length > sheets.length) {
        parts.push(`… 另有 ${sheetNames.length - sheets.length} 个 sheet 未读取（上限 ${maxSheets}）`);
        truncated = true;
    }
    // 单 sheet 行数被 sheetRowLimit 截断
    if (sheetTruncated) {
        parts.push(`… 已截断：每个 sheet 仅保留前 ${options.sheetRowLimit} 行，全簿共 ${totalRows} 行`);
    }
    return parts.join('\n\n');
}
