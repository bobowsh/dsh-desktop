import { Service, type Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import { SessionId } from '@deepseek-ai/dsh-session';
import type { KvTable } from '@deepseek-ai/dsh-storage-domain';
import { AgentId, DispatchId, SquadId, type AgentRecord, type AgentRouteRemap, type AgentTeamExportDocument, type AgentTeamImportMode, type AgentTeamImportPreview, type AgentTeamImportResult, type AgentTeamRecipeDocument, type ProjectSquadDefaultRecord, type RecipeImportResult, type RecipePreviewResult, type SessionNextSquadModeRecord, type SessionSquadModeRecord, type SessionSquadModeView, type SquadMessageClaimRecord, type SquadRecord, type SquadRunRecord, type SquadVersionRecord } from '../../types.ts';
import { type AgentTeamConfig } from '../domain/host.ts';
import { WriteCoordinator } from '../infrastructure/write-coordinator.ts';
export interface DefinitionSnapshot {
    readonly agents: ReadonlyMap<AgentId, AgentRecord>;
    readonly squads: ReadonlyMap<SquadId, SquadRecord>;
}
/**
 * Definition, versioning, portable-data, and mode use cases. This layer knows
 * durable tables but has no orchestration/runtime responsibility.
 */
export declare class DefinitionApplicationService extends Service {
    protected readonly config: AgentTeamConfig;
    protected readonly definitionWrites: WriteCoordinator;
    protected agentsTable?: KvTable<AgentId, AgentRecord>;
    protected squadsTable?: KvTable<SquadId, SquadRecord>;
    protected sessionModesTable?: KvTable<SessionId, SessionSquadModeRecord>;
    protected nextModesTable?: KvTable<SessionId, SessionNextSquadModeRecord>;
    protected messageClaimsTable?: KvTable<string, SquadMessageClaimRecord>;
    protected runsTable?: KvTable<DispatchId, SquadRunRecord>;
    protected squadVersionsTable?: KvTable<string, SquadVersionRecord>;
    protected projectDefaultsTable?: KvTable<string, ProjectSquadDefaultRecord>;
    /** Process-local fast path; durable receipts remain the authority. */
    private readonly lastGuaranteedMessage;
    constructor(ctx: Context, config: AgentTeamConfig);
    /** Composition-root seam used once after the storage domain opens. */
    protected attachTables(tables: {
        agents: KvTable<AgentId, AgentRecord>;
        squads: KvTable<SquadId, SquadRecord>;
        sessionModes: KvTable<SessionId, SessionSquadModeRecord>;
        nextModes: KvTable<SessionId, SessionNextSquadModeRecord>;
        messageClaims: KvTable<string, SquadMessageClaimRecord>;
        runs: KvTable<DispatchId, SquadRunRecord>;
        squadVersions: KvTable<string, SquadVersionRecord>;
        projectDefaults: KvTable<string, ProjectSquadDefaultRecord>;
    }): void;
    protected agents(): KvTable<AgentId, AgentRecord>;
    protected squads(): KvTable<SquadId, SquadRecord>;
    protected sessionModes(): KvTable<SessionId, SessionSquadModeRecord>;
    protected nextModes(): KvTable<SessionId, SessionNextSquadModeRecord>;
    protected messageClaims(): KvTable<string, SquadMessageClaimRecord>;
    protected runs(): KvTable<DispatchId, SquadRunRecord>;
    protected squadVersions(): KvTable<string, SquadVersionRecord>;
    protected projectDefaults(): KvTable<string, ProjectSquadDefaultRecord>;
    protected errorText(error: unknown): string;
    private assertPortableDocumentBounds;
    /** Authoritative effective values for omitted/inherited definition fields. */
    definitionDefaults(): {
        readonly executionMode: 'serial' | 'parallel';
        readonly fixedOrderExecutionMode: 'serial';
        readonly contextMode: 'spawn' | 'fork' | 'chain';
        readonly planningContext: 'full';
        readonly plannerMaxTokens: 2_048;
    };
    /** One coherent clone of the definition graph, never a view into live tables. */
    readDefinitionSnapshot(signal?: AbortSignal): Promise<DefinitionSnapshot>;
    /** RPC-facing barrier for a small synchronous read spanning definition tables. */
    readDefinitionState<T>(reader: () => T, signal?: AbortSignal): Promise<T>;
    /** Freeze a squad and every referenced definition before a run starts. */
    protected readSquadExecutionSnapshot(squadId: SquadId, signal?: AbortSignal): Promise<{
        readonly squad: SquadRecord | undefined;
        readonly agents: ReadonlyMap<AgentId, AgentRecord>;
    }>;
    protected validateModelRoute(record: AgentRecord, signal?: AbortSignal, options?: {
        readonly validateTools?: boolean;
    }): Promise<void>;
    private validateToolPolicy;
    createAgent(record: AgentRecord, id?: AgentId, signal?: AbortSignal): Promise<AgentId>;
    updateAgent(id: AgentId, record: AgentRecord, signal?: AbortSignal): Promise<void>;
    deleteAgent(id: AgentId, signal?: AbortSignal): Promise<boolean>;
    getAgent(id: AgentId): AgentRecord | undefined;
    listAgents(): [AgentId, AgentRecord][];
    protected validateSquadRecord(record: SquadRecord, knownAgents?: ReadonlySet<string>, options?: {
        readonly allowLegacyEmpty?: boolean;
    }): void;
    protected recordSquadVersion(squadId: SquadId, record: SquadRecord, signal?: AbortSignal): Promise<void>;
    createSquad(record: SquadRecord, id?: SquadId, signal?: AbortSignal): Promise<SquadId>;
    updateSquad(id: SquadId, record: SquadRecord, signal?: AbortSignal): Promise<void>;
    deleteSquad(id: SquadId, signal?: AbortSignal): Promise<boolean>;
    getSquad(id: SquadId): SquadRecord | undefined;
    listSquads(): [SquadId, SquadRecord][];
    diagnoseSquad(id: SquadId, signal?: AbortSignal): Promise<{
        ok: boolean;
        checks: Array<{
            name: string;
            ok: boolean;
            message: string;
        }>;
    }>;
    listSquadVersions(squadId: SquadId): SquadVersionRecord[];
    restoreSquadVersion(squadId: SquadId, version: number, signal?: AbortSignal, expectedRevision?: number): Promise<void>;
    previewSquadRestore(squadId: SquadId, version: number, signal?: AbortSignal): Promise<{
        definitionRevision: number;
        squadId: SquadId;
        version: number;
        record: SquadRecord;
        memberSnapshots: NonNullable<SquadVersionRecord['memberSnapshots']>;
        conflicts: Array<{
            agentId: AgentId;
            currentName: string;
            restoredName: string;
        }>;
        affectedSquads: Array<{
            squadId: SquadId;
            squadName: string;
            agentIds: AgentId[];
        }>;
    }>;
    private previewSquadRestoreUnlocked;
    getSessionSquadMode(sessionId: SessionId): SessionSquadModeView | undefined;
    getSessionSquadOverride(sessionId: SessionId): 'enabled' | 'disabled' | 'inherit';
    setSessionSquadMode(sessionId: SessionId, squadId?: SquadId, signal?: AbortSignal): Promise<SessionSquadModeView | undefined>;
    inheritSessionSquadMode(sessionId: SessionId, signal?: AbortSignal): Promise<SessionSquadModeView | undefined>;
    getNextSessionSquadMode(sessionId: SessionId): SessionNextSquadModeRecord | undefined;
    setNextSessionSquadMode(sessionId: SessionId, state: 'inherit' | 'solo' | 'team', squadId?: SquadId, signal?: AbortSignal): Promise<SessionNextSquadModeRecord | undefined>;
    /** Bind a one-shot to exactly one message before any other durable write. */
    protected claimNextSessionSquadMode(sessionId: SessionId, messageId: string): Promise<SessionNextSquadModeRecord | undefined>;
    protected clearClaimedNextSessionSquadMode(sessionId: SessionId, messageId: string): Promise<void>;
    projectKeyFor(agent: Agent): string | undefined;
    projectKeyForSession(session: Agent['session']): string | undefined;
    getEffectiveSessionSquadModeForSession(session: Agent['session'], sessionId?: SessionId): SessionSquadModeView | undefined;
    getEffectiveSessionSquadMode(agent: Agent): SessionSquadModeView | undefined;
    protected isDelegatedAgent(agent: Agent): boolean;
    protected isDelegatedSession(session: Agent['session']): boolean;
    protected claimGuaranteedMessage(agent: Agent, messageId: string, kind: 'solo' | 'team'): Promise<boolean>;
    /** Bound durable idempotency receipts independently from run history. */
    protected pruneMessageClaims(now?: number): Promise<number>;
    getProjectDefault(projectKey: string): ProjectSquadDefaultRecord | undefined;
    setProjectDefault(projectKey: string, squadId?: SquadId, signal?: AbortSignal): Promise<ProjectSquadDefaultRecord | undefined>;
    squadModeGuidance(agent: Agent | undefined): string;
    exportDefinitions(): Promise<AgentTeamExportDocument>;
    /** Parse and validate the complete closed definition graph before any write. */
    private prepareDefinitionsImport;
    private changedAgentIds;
    private affectedSquadsFor;
    private revalidatePreparedImport;
    /** Complete read-only impact report for the explicit import confirmation UI. */
    previewDefinitionsImport(document: unknown, mode?: AgentTeamImportMode, signal?: AbortSignal): Promise<AgentTeamImportPreview>;
    importDefinitions(document: unknown, mode?: AgentTeamImportMode, signal?: AbortSignal, expectedRevision?: number): Promise<AgentTeamImportResult>;
    exportRecipe(squadId: SquadId, signal?: AbortSignal): Promise<AgentTeamRecipeDocument>;
    private exportRecipeUnlocked;
    previewRecipe(document: unknown, routeRemap?: Readonly<Record<string, AgentRouteRemap>>, signal?: AbortSignal): Promise<RecipePreviewResult>;
    private parseRecipeDocument;
    private previewRecipeAgainstSnapshot;
    importRecipe(document: unknown, policy: 'merge' | 'copy', routeRemap?: Readonly<Record<string, AgentRouteRemap>>, signal?: AbortSignal, expectedRevision?: number): Promise<RecipeImportResult>;
    resolveSquadId(reference: string): SquadId;
    addMemberToSquad(squadId: SquadId, agentId: AgentId, signal?: AbortSignal): Promise<SquadRecord>;
    removeMemberFromSquad(squadId: SquadId, agentId: AgentId, signal?: AbortSignal): Promise<SquadRecord>;
}
//# sourceMappingURL=definition-service.d.ts.map