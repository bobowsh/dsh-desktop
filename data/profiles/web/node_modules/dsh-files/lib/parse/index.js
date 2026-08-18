// Unified document parsing entry: dispatch by sniffed format, keep line
// semantics consistent across parsers.
import { parsePdf } from "./pdf.js";
import { parseDocx } from "./docx.js";
import { parseXlsx } from "./xlsx.js";
import { decodeText } from "./text.js";
export async function parseDocument(bytes, format, options) {
    // sheet/listOnly 只对 xlsx 有意义：对 PDF/DOCX/text 显式报错，防止调用方
    // 以为 sheet 参数生效而拿到完整（未按 sheet 过滤）内容。
    if ((options.sheet !== undefined || options.listOnly === true) && format !== 'xlsx') {
        throw new Error(`sheet/listOnly parameters are only supported for XLSX files (format: ${format})`);
    }
    switch (format) {
        case 'pdf':
            return parsePdf(bytes);
        case 'docx':
            return parseDocx(bytes);
        case 'xlsx':
            return parseXlsx(bytes, options);
        case 'text': {
            const text = decodeText(bytes);
            if (text === null) {
                throw new Error('cannot decode text file: unsupported encoding (expected UTF-8, UTF-16 or GB18030)');
            }
            return text;
        }
    }
}
