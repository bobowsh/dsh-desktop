/**
 * Word (.docx) tools: `word_create` builds a styled document with the `docx`
 * package; `word_read` extracts plain text with `mammoth`.
 */
import type { Context } from '@deepseek-ai/cordis';
export declare function registerWordTools(ctx: Context): () => void;
