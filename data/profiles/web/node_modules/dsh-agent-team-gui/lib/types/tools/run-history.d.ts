import type { KvTable } from '@deepseek-ai/dsh-storage-domain';
import type { SessionId } from '@deepseek-ai/dsh-session';
import type { DispatchId, SquadInsightsSummary, SquadRunRecord } from '../types.ts';
/**
 * Coverage is independent from token totals: providerReported stays "any
 * official sample", while this value tells the UI whether every expected
 * planner/member/review/repair sample was observed.
 */
export declare function runMeteringCoverage(run: SquadRunRecord): 'full' | 'partial' | 'none';
/** Persistence-facing lifecycle and aggregation policy, isolated from orchestration. */
export declare class RunHistoryStore {
    private readonly table;
    constructor(table: KvTable<DispatchId, SquadRunRecord>);
    reconcileInterrupted(now?: number): Promise<number>;
    enforceRetention(maxRuns: number, maxAgeDays: number, now?: number): Promise<number>;
    list(sessionId?: SessionId, limit?: number): SquadRunRecord[];
    clear(filters: {
        readonly id?: DispatchId;
        readonly sessionId?: SessionId;
        readonly before?: number;
        readonly settledOnly?: boolean;
    }, signal?: AbortSignal): Promise<number>;
    insights(filters: {
        readonly sessionId?: SessionId;
        readonly projectKey?: string;
        readonly squadId?: string;
        readonly since?: number;
        readonly until?: number;
    }): SquadInsightsSummary;
}
//# sourceMappingURL=run-history.d.ts.map