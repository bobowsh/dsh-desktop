/**
 * PowerPoint (.pptx) tools: `ppt_create` builds slide decks with pptxgenjs
 * (text, bullets, speaker notes, and PNG/JPG/GIF images); `ppt_read` unzips a
 * deck with JSZip and extracts paragraph text, speaker notes, and per-slide
 * image counts without any native dependency.
 */
import type { Context } from '@deepseek-ai/cordis';
export declare function registerPptTools(ctx: Context): () => void;
