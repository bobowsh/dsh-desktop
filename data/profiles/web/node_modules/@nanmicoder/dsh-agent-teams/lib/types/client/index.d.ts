/** Browser plugin for the AgentTeams activity floater and conversation card. */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
/** Required services: conversation nodes, slots, and sessions navigation. */
export declare const inject: string[];
/**
 * Register the activity monitor in the shell's additive overlay and the
 * in-conversation team card. The card's activity button re-opens a folded
 * monitor via a window event — the recovery path for an old session.
 */
export declare function apply(ctx: ClientContext): void;
