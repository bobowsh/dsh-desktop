/**
 * dsh-office-tools host plugin.
 *
 * Registers seven model-facing tools on `ctx.tools`:
 *
 *   word_create / word_read
 *   excel_create / excel_read / excel_update
 *   ppt_create / ppt_read
 *
 * All file access is confined to the calling agent's session workspace and
 * every registration is wrapped in `ctx.effect` so Cordis disposes the tools
 * with the plugin fiber.
 */
import type { Context } from '@deepseek-ai/cordis';
/** Plugin identity for cordis.yml rows. */
export declare const name = "dsh-office-tools";
/** The tool registry is the only runtime service this plugin requires. */
export declare const inject: string[];
export declare function apply(ctx: Context): void;
