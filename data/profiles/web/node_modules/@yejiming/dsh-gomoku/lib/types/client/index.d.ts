/**
 * Gomoku browser half, plugin entry: registers the gomoku conversation view
 * tab (right of Trajectory) and the gomoku dictionaries. The board state
 * lives in the module-level store, so tab switches never reset the game.
 * @module @yejiming/dsh-gomoku/client
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import { type GomokuKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** The gomoku board tab copy. */
        gomoku: GomokuKey;
    }
}
/** Required services: the locale service and the slot registry. */
export declare const inject: string[];
/**
 * Client plugin body: register the gomoku dictionaries and the
 * conversation-view tab. The registration rides the slot service's effect
 * wrapper, so plugin unload removes the tab.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
