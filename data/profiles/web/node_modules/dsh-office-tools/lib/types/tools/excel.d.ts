/**
 * Excel (.xlsx) tools over SheetJS: `excel_create` writes a new workbook,
 * `excel_read` materializes sheets as rows of scalar cells, and
 * `excel_update` replaces/creates whole sheets and/or writes individual cell
 * values into an existing workbook.
 */
import type { Context } from '@deepseek-ai/cordis';
export declare function registerExcelTools(ctx: Context): () => void;
