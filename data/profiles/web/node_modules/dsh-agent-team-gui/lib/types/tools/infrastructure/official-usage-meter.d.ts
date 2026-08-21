import type { Context } from '@deepseek-ai/cordis';
import type { SubagentRun } from '@deepseek-ai/dsh-subagent';
import type { AgentTokenUsage } from '../../types.ts';
export interface TokenUsageProjection {
    readonly uncachedInputTokens: number;
    readonly outputTokens: number;
    readonly cacheReadTokens: number;
    readonly cacheWriteTokens: number;
}
/** Narrow adapter over the official session `tokenUsage` projection. */
export declare class OfficialUsageMeter {
    private readonly ctx;
    constructor(ctx: Context);
    add(...samples: Array<AgentTokenUsage | undefined>): AgentTokenUsage;
    private projectionFor;
    usageFor(run: SubagentRun, baseline?: TokenUsageProjection): AgentTokenUsage | undefined;
    baselineFor(run: SubagentRun): TokenUsageProjection | undefined;
    /** Subscribe one child and serialize durable publications without blocking projection callbacks. */
    track(run: SubagentRun, baseline: TokenUsageProjection | undefined, publishUsage: (usage: AgentTokenUsage) => Promise<void>, label: string): () => Promise<AgentTokenUsage | undefined>;
}
//# sourceMappingURL=official-usage-meter.d.ts.map