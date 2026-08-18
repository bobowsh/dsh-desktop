/** Durable automation authority: definitions, occurrence claims, clock, and run execution. */
import type { Context } from '@deepseek-ai/cordis';
import type { AutomationDefinition, AutomationRun, AutomationSchedule, PermissionPreset, UpdateAutomationInput } from './types.ts';
export declare const AUTOMATION_SESSION_PREFIX = "dsh-automation-session-";
export interface AutomationConfig {
    readonly maxConcurrentRuns: number;
    readonly runTimeoutMs: number;
    readonly misfireGraceMs: number;
    readonly historyLimit: number;
    readonly archiveRunSessions: boolean;
}
export interface CreateRequest {
    readonly name: string;
    readonly prompt: string;
    readonly schedule: AutomationSchedule;
    readonly permissionPreset?: PermissionPreset;
}
export interface AutomationScope {
    readonly sessionId: string;
    readonly creatorKind: 'agent' | 'web';
}
export interface AutomationSnapshot {
    readonly generatedAt: string;
    readonly workspace: {
        readonly id: string;
        readonly title: string;
        readonly path: string;
    };
    readonly definitions: readonly AutomationDefinitionView[];
    readonly runs: readonly AutomationRunView[];
}
export interface AutomationDefinitionView extends AutomationDefinition {
    readonly nextRunAt: string | null;
    readonly lastRun: AutomationRun | null;
}
export interface AutomationRunView extends AutomationRun {
    readonly sessionArchived: boolean;
}
interface SessionEventLike {
    readonly type: string;
    readonly data: unknown;
}
/** One host-lifetime service. Timer state is disposable; domain records are authority. */
export declare class AutomationService {
    private readonly ctx;
    private readonly domain;
    private readonly config;
    private definitions;
    private runs;
    private timer;
    private operationTail;
    private pumpScheduled;
    private requested;
    private started;
    private stopping;
    private readonly active;
    private constructor();
    static open(ctx: Context, config: AutomationConfig): Promise<AutomationService>;
    /** Start the disposable clock only after the surrounding Loader has settled. */
    start(): void;
    /**
     * Automation-created sessions must never receive management tools. The run
     * table covers live/new sessions; durable message provenance covers an old
     * session even after its bounded run record has been pruned.
     */
    ownsSession(sessionId: string, events?: readonly SessionEventLike[]): boolean;
    dispose(): Promise<void>;
    snapshot(scope: AutomationScope, signal?: AbortSignal): Promise<AutomationSnapshot>;
    create(scope: AutomationScope, request: CreateRequest, signal?: AbortSignal): Promise<AutomationDefinition>;
    update(scope: AutomationScope, id: string, input: Omit<UpdateAutomationInput, 'now'> & {
        readonly status?: 'active' | 'paused';
        readonly expectedRevision?: number;
    }, signal?: AbortSignal): Promise<AutomationDefinition>;
    delete(scope: AutomationScope, id: string, signal?: AbortSignal): Promise<{
        readonly id: string;
        readonly deleted: boolean;
    }>;
    runNow(scope: AutomationScope, id: string, signal?: AbortSignal): Promise<AutomationRun>;
    markRead(scope: AutomationScope, runId: string, signal?: AbortSignal): Promise<AutomationRun>;
    private resolveScope;
    private ownedDefinition;
    private requestPump;
    private pumpOnce;
    private claimLatestDue;
    private startQueuedRuns;
    private startRun;
    private executeRun;
    private armNextTimer;
    private armRetryTimer;
    private clearTimer;
    /** Serialize service-level mutations and scheduler admission around domain writes. */
    private serialize;
    private recoverInterruptedRuns;
    /** Archive terminal run Sessions without changing their durable run result. */
    private archiveRunSession;
    /** Retry terminal Session archival on startup before bounded run pruning. */
    private archiveTerminalRunSessions;
    /** Keep every active record plus the configured newest terminal records per automation. */
    private pruneWorkspaceHistory;
    private pruneAllHistory;
}
export {};
