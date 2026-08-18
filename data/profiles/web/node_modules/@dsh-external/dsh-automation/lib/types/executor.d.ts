/** Fresh-Agent execution boundary for one already-claimed automation run. */
import type { Context } from '@deepseek-ai/cordis';
import type { AutomationDefinition, AutomationRun } from './types.ts';
interface SessionEventLike {
    readonly seq: number;
    readonly type: string;
    readonly data: Record<string, any>;
}
/** Final scoped denial for capabilities that require a person or spawn another authority boundary. */
export declare function unattendedToolGuardReason(name: string, args: unknown): string | undefined;
export interface RunCompletion {
    readonly sessionId?: string;
    readonly status: 'succeeded' | 'failed' | 'cancelled';
    readonly summary?: string;
    readonly error?: {
        readonly code: string;
        readonly message: string;
    };
}
export interface ExecutorConfig {
    readonly runTimeoutMs: number;
    readonly sessionId: string;
    readonly signal?: AbortSignal;
}
/** Last assistant text and closed-turn reason for the interval owned by this run. */
export declare function summarizeRun(events: readonly SessionEventLike[], firstSeq: number): {
    readonly text: string;
    readonly reason?: Record<string, any>;
};
/**
 * Execute exactly one durable run in a fresh root Agent. The new Session owns
 * no source-chat history or grant; policy and model selection are installed
 * before publication.
 */
export declare function executeAutomationRun(ctx: Context, definition: AutomationDefinition, run: AutomationRun, config: ExecutorConfig): Promise<RunCompletion>;
export {};
