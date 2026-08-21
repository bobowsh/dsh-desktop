import type { InsightsBucket, PlanView, RunStatus, RunView, TokenUsageView } from './contracts.ts';
import type { MessageKey, Translate } from './i18n.ts';
export interface PlanStage {
    index: number;
    agentIds: string[];
}
/** Stable topological layers for a plan timeline. Invalid edges degrade to display order. */
export declare function planStages(plan?: PlanView): PlanStage[];
export declare function formatTokens(value: number): string;
export declare function formatDuration(startedAt: number, endedAt?: number, now?: number): string;
export declare function statusKey(status: RunStatus): MessageKey;
export declare function isLive(status: RunStatus): boolean;
export declare function isAttention(status: RunStatus): boolean;
export declare function usageShare(usage: TokenUsageView): number;
export declare function completionRate(runs: readonly RunView[]): number | null;
export declare function describeBucket(bucket: InsightsBucket): string;
export declare function downloadJson(documentValue: unknown, filename: string): void;
export declare function visibleRunFilter(run: RunView, filter: 'all' | 'live' | 'attention' | 'done'): boolean;
export declare function tokenSummary(usage: TokenUsageView, t: Translate): string;
//# sourceMappingURL=view-models.d.ts.map