import type { Agent } from '@deepseek-ai/dsh-agent';
import type { UserMessage } from '@deepseek-ai/dsh-llm';
import type { SessionId } from '@deepseek-ai/dsh-session';
import { RunHistoryStore } from '../run-history.ts';
import { DefinitionApplicationService } from './definition-service.ts';
import { AgentId, DispatchId, SquadId, type AgentRecord, type AgentTeamRunExportDocument, type SquadDispatchRequest, type SquadDispatchResult, type SquadExecutionPlan, type SquadInsightsSummary, type SquadRecord, type SquadRunRecord } from '../../types.ts';
export interface DispatchTrace {
    readonly sessionId?: SessionId;
    readonly sourceMessageId?: string;
    readonly dispatchId?: DispatchId;
    readonly retryOf?: DispatchId;
    readonly responseMode?: 'foreground' | 'background';
    readonly selectedAgentIds?: readonly AgentId[];
    /** Immutable source plan replayed by a whole-run retry without replanning. */
    readonly replayPlan?: SquadExecutionPlan;
    readonly onStored?: (error?: unknown) => void;
    /** Internal durable acceptance metadata for a background job. */
    readonly backgroundJobId?: string;
    readonly backgroundRequestKey?: string;
    /** Definition graph frozen at durable background acceptance. */
    readonly frozenDefinition?: {
        readonly squad: SquadRecord;
        readonly agents: ReadonlyMap<AgentId, AgentRecord>;
    };
}
/**
 * Runtime orchestration application service. It depends on the definition
 * layer and official Harness adapters, while keeping the Cordis facade thin.
 */
export declare class ExecutionApplicationService extends DefinitionApplicationService {
    private runHistory?;
    private readonly activeRunControllers;
    private readonly activeDispatchKeys;
    private readonly backgroundAcceptances;
    private readonly pendingBackgroundRuns;
    private readonly usageMeter;
    protected history(): RunHistoryStore;
    protected recoverRunHistory(): Promise<{
        reconciled: number;
        pruned: number;
    }>;
    /** Whether the optional official jobs adapter is currently composed. */
    backgroundJobsAvailable(): boolean;
    private resolveMembers;
    private promptFor;
    /** Preserve both ends of large user text while bounding every model-facing prompt. */
    private boundedExcerpt;
    private resultText;
    protected messageText(message: UserMessage): string;
    /**
     * Model tools may be emitted more than once in one model step. Bind a tool
     * dispatch to the latest durable human message, rather than to the tool-call
     * id, so sequential duplicate calls cannot start a second squad after the
     * first one settles.
     */
    private latestHumanMessageId;
    dispatchFromTool(request: SquadDispatchRequest, parent: Agent, signal: AbortSignal): Promise<SquadDispatchResult>;
    protected renderSquadContext(result: SquadDispatchResult): string;
    private addUsage;
    /** Provider-reported usage for this run only, excluding a fork seed baseline. */
    private usageFor;
    /** Fork children begin with parent history; spawn children have no seed to subtract. */
    private usageBaselineFor;
    private updateRun;
    private updateRunMember;
    /** Stream official token projection changes into the durable live run row. */
    private trackRunUsage;
    /** Stream official projection samples for planner/reviewer/repair work. */
    private trackAuxiliaryUsage;
    private withoutLiveUsage;
    private settleRun;
    private runMember;
    /** Preserve configured restrictions while hard-denying recursive team/delegation tools when present. */
    private childToolScope;
    private runMemberWithPolicy;
    private createAutomaticPlan;
    private runQualityReview;
    private runQualityLoop;
    /**
     * Dispatch through the existing subagent providers. Parent `tool/call` and
     * `tool/result` records contain this complete result, while each returned
     * child id points to the provider-owned child Session and its descriptor.
     */
    dispatch(request: SquadDispatchRequest, parent: Agent, signal: AbortSignal, trace?: DispatchTrace): Promise<SquadDispatchResult>;
    /** Start a detached run through the official jobs seam when available. */
    startBackgroundDispatch(request: SquadDispatchRequest, parent: Agent, trace?: DispatchTrace, signal?: AbortSignal): Promise<{
        id: DispatchId;
        status: 'queued';
        jobId?: string;
    }>;
    /**
     * Persist acceptance before registering any process-local work. Once the
     * queued row exists, cancellation of the caller no longer turns a committed
     * mutation into an apparent failure; a repeated request finds the same row.
     */
    private acceptBackgroundDispatch;
    /** Non-executing plan preview. A fixed workflow returns a deterministic graph without a planner call. */
    previewPlan(squadId: SquadId, task: string, parent: Agent, signal: AbortSignal): Promise<SquadExecutionPlan>;
    /** Newest-first durable run history; summary mode never returns raw member/quality output. */
    listRuns(sessionId?: SessionId, limit?: number, detail?: boolean): SquadRunRecord[];
    getRun(id: DispatchId): SquadRunRecord | undefined;
    cancelRun(id: DispatchId): boolean;
    retryRun(id: DispatchId, parent: Agent, agentId?: AgentId, signal?: AbortSignal): Promise<{
        id: DispatchId;
        status: 'queued';
        retryOf: DispatchId;
    }>;
    clearRuns(filters: {
        readonly id?: DispatchId;
        readonly sessionId?: SessionId;
        readonly before?: number;
        readonly settledOnly?: boolean;
    }, signal?: AbortSignal): Promise<number>;
    exportRun(id: DispatchId): AgentTeamRunExportDocument;
    insights(filters: {
        readonly sessionId?: SessionId;
        readonly projectKey?: string;
        readonly squadId?: SquadId;
        readonly since?: number;
        readonly until?: number;
    }): SquadInsightsSummary;
}
//# sourceMappingURL=execution-service.d.ts.map