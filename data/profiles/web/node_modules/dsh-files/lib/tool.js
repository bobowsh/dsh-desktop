// The model-facing read_document tool. Reads through ctx.fs, so workspace
// resolution, sandbox policy and fs-observation policy behave exactly like the
// built-in read tool. Differences from the plain-text read tool: content
// sniffing (never trusts extensions), size pre-check before reading bytes, and
// an LRU parse cache keyed on (targetKey, version, format).
import { defineTool } from '@deepseek-ai/dsh-tools';
import { FsError } from '@deepseek-ai/dsh-fs';
import { sniffFormat, sniffHead, HEAD_SNIFF_BYTES, SUPPORTED_FORMATS } from "./detect.js";
import { parseDocument } from "./parse/index.js";
import { windowLines } from "./parse/text.js";
function assertPositiveInteger(value, label) {
    if (!Number.isInteger(value) || value < 1)
        throw new Error(`${label} must be a positive integer`);
}
function parseArgs(args, config) {
    if (typeof args.file_path !== 'string' || args.file_path.trim() === '') {
        throw new Error('file_path must be a non-empty string');
    }
    const offset = typeof args.offset === 'number' ? args.offset : 1;
    if (!Number.isInteger(offset) || offset < 1)
        throw new Error('offset must be a positive integer');
    const limit = typeof args.limit === 'number' ? args.limit : config.readLimit;
    if (!Number.isInteger(limit) || limit < 1)
        throw new Error('limit must be a positive integer');
    if (limit > config.readLimit)
        throw new Error(`limit must be less than or equal to ${config.readLimit}`);
    const format = args.format === undefined ? 'auto' : args.format;
    if (typeof format !== 'string' || (format !== 'auto' && !SUPPORTED_FORMATS.has(format))) {
        throw new Error(`unsupported format "${String(format)}" (expected auto, pdf, docx, xlsx or text)`);
    }
    return { filePath: args.file_path, offset, limit, format: format };
}
/** The session workspace cwd for this call, when one applies. */
function sessionCwd(exec) {
    return exec.agent?.session?.header?.cwd;
}
function renderEnvelope(path, format, value) {
    // 信封带前两行正文预览：模型一眼看到内容在 lines 里，不会误以为只有元信息。
    const preview = value.lines
        .slice(0, 2)
        .map((l) => `  ${l.number}: ${l.text.slice(0, 120)}`)
        .join('\n');
    return [
        `### document ${path} (${format})`,
        `offset ${value.offset}, ${value.lines.length}/${value.totalLines} lines; full content in \`lines\`:`,
        preview
    ].join('\n');
}
export function defineReadDocumentTool(ctx, config, cache) {
    return defineTool({
        name: 'read_document',
        description: 'Read a document file (text, PDF, DOCX or XLSX) and return its content as line-numbered pages. Use for files the plain read tool cannot handle, and page through long documents with offset and limit.',
        parameters: {
            file_path: {
                type: 'string',
                required: true,
                description: 'Path to the document, resolved by the filesystem backend.'
            },
            format: {
                type: 'string',
                enum: ['auto', 'pdf', 'docx', 'xlsx', 'text'],
                description: 'Optional format override; the file content is still sniffed and wins over this hint.'
            },
            offset: {
                type: 'number',
                description: '1-based first line to return. Defaults to 1.'
            },
            limit: {
                type: 'number',
                description: `Maximum number of lines to return. Defaults to ${config.readLimit}.`
            }
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    path: { type: 'string', required: true },
                    format: { type: 'string', required: true, enum: ['pdf', 'docx', 'xlsx', 'text'] },
                    offset: { type: 'integer', required: true },
                    lines: {
                        type: 'array',
                        required: true,
                        items: {
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                                number: { type: 'integer', required: true },
                                text: { type: 'string', required: true }
                            }
                        }
                    },
                    totalLines: { type: 'integer', required: true }
                }
            },
            render: (_args, value) => [
                {
                    type: 'text',
                    text: renderEnvelope(value.path, value.format, value)
                }
            ]
        },
        isConcurrencySafe: () => true,
        async execute(args, exec) {
            const input = parseArgs(args, config);
            const cwd = sessionCwd(exec);
            const target = await ctx.fs.resolve(input.filePath, {
                ...(cwd !== undefined ? { cwd } : {}),
                signal: exec.signal
            });
            const info = await ctx.fs.stat(target, exec.signal);
            if (info === undefined) {
                ctx.emit('fs/observed', target, { kind: 'absent' }, exec);
                throw new FsError(`cannot read "${target.displayPath}": not found`, 'FS_NOT_FOUND');
            }
            if (info.type !== 'file') {
                throw new FsError(`cannot read "${target.displayPath}": not a regular file`, 'FS_NOT_REGULAR_FILE');
            }
            if (info.size !== undefined && info.size > config.maxFileBytes) {
                ctx.emit('fs/observed', target, { kind: 'present', version: info.version }, exec);
                throw new FsError(`cannot read "${target.displayPath}": file is ${info.size} bytes, over the ${config.maxFileBytes} byte limit`, 'FS_TOO_LARGE');
            }
            // 分阶段读取：先读 64 KiB 头部判定格式。头部证据不足（非 zip/pdf/text/已知二进制）
            // 且无显式 format 时立即拒绝，不读全量字节（大文件省去无谓 IO 与内存峰值）。
            const head = await ctx.fs.readBytes(target, exec.signal, HEAD_SNIFF_BYTES);
            const headFormat = sniffHead(head);
            if (headFormat === null && input.format === 'auto') {
                ctx.emit('fs/observed', target, { kind: 'present', version: info.version }, exec);
                throw new FsError(`cannot read "${target.displayPath}": unrecognized file content (expected text, PDF, DOCX or XLSX)`, 'FS_NOT_TEXT');
            }
            const bytes = await ctx.fs.readBytes(target, exec.signal, config.maxFileBytes);
            // zip 需要中央目录（在文件尾部）才能区分 docx/xlsx；
            // headFormat 为 null 只发生在显式 format 场景，走完整嗅探兜底。
            const format = headFormat === 'zip' || headFormat === null
                ? sniffFormat(bytes, input.format === 'auto' ? undefined : input.format)
                : headFormat;
            if (format === null) {
                ctx.emit('fs/observed', target, { kind: 'present', version: info.version }, exec);
                throw new FsError(`cannot read "${target.displayPath}": unrecognized file content (expected text, PDF, DOCX or XLSX)`, 'FS_NOT_TEXT');
            }
            const cacheKey = { targetKey: target.targetKey, version: info.version, format };
            let text = cache.get(cacheKey);
            if (text === undefined) {
                text = await parseDocument(bytes, format, { sheetRowLimit: config.sheetRowLimit, maxSheets: config.maxSheets });
                cache.set(cacheKey, text);
            }
            const window = windowLines(text, input.offset, input.limit);
            ctx.emit('fs/observed', target, { kind: 'present', version: info.version }, exec);
            return {
                path: target.displayPath,
                format,
                offset: input.offset,
                lines: window.lines,
                totalLines: window.totalLines
            };
        },
        presentCall(args) {
            return {
                card: 'generic',
                title: `Read document ${args.file_path}`,
                kind: 'read',
                locations: [{ path: args.file_path }]
            };
        }
    });
}
