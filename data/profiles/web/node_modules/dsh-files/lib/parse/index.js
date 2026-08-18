// Unified document parsing entry: dispatch by sniffed format, keep line
// semantics consistent across parsers.
import { parsePdf } from "./pdf.js";
import { parseDocx } from "./docx.js";
import { parseXlsx } from "./xlsx.js";
import { decodeText } from "./text.js";
export async function parseDocument(bytes, format, options) {
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
