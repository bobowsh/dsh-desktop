// PDF text extraction via pdfjs-dist (Mozilla's maintained renderer).
// Replaces pdf-parse@1.1.1 (unmaintained since 2020, crash-prone debug path).
// Text layer only — no rendering, no font downloads (useSystemFonts for any
// embedded font fallback stays local).
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
/**
 * Extract the text layer of a PDF as line-oriented text (one entry per
 * original line where the content stream marks EOLs), pages separated by a
 * blank line.
 */
export async function parsePdf(bytes) {
    const doc = await getDocument({
        data: bytes,
        // Node has no web worker; these options keep the legacy build self-contained.
        disableWorker: true,
        isEvalSupported: false,
        useSystemFonts: true
    }).promise;
    try {
        const pages = [];
        for (let pageNo = 1; pageNo <= doc.numPages; pageNo++) {
            const page = await doc.getPage(pageNo);
            try {
                const content = await page.getTextContent();
                const lines = [];
                let line = '';
                for (const item of content.items) {
                    if ('str' in item) {
                        line += item.str;
                        if (item.hasEOL) {
                            lines.push(line);
                            line = '';
                        }
                    }
                }
                if (line !== '')
                    lines.push(line);
                pages.push(lines.join('\n'));
            }
            finally {
                page.cleanup();
            }
        }
        return pages.join('\n\n');
    }
    finally {
        await doc.destroy();
    }
}
