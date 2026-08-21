import { z } from 'zod';
import type { SessionId } from '@deepseek-ai/dsh-session';
import type { AgentExportItem, AgentId, AgentRecord, AgentTeamExportDocument, AgentTeamRecipeDocument, DispatchId, ProjectSquadDefaultRecord, SessionNextSquadModeRecord, SessionSquadModeRecord, SquadExportItem, SquadId, SquadMessageClaimRecord, SquadRecord, SquadRunRecord, SquadVersionRecord } from './types.ts';
/** New-write validation. Kept under the original export name for API compatibility. */
export declare const agentRecordSchema: z.ZodType<AgentRecord>;
/** Backward-compatible durable/v1 read validation. */
export declare const agentRecordReadSchema: z.ZodType<AgentRecord>;
/** New-write validation. Kept under the original export name for API compatibility. */
export declare const squadRecordSchema: z.ZodType<SquadRecord>;
/** Backward-compatible durable/v1 read validation. */
export declare const squadRecordReadSchema: z.ZodType<SquadRecord>;
/** One agent row of an import/export document; the durable fields plus its id. */
export declare const agentExportItemSchema: z.ZodType<AgentExportItem>;
/** One squad row of an import/export document; the durable fields plus its id. */
export declare const squadExportItemSchema: z.ZodType<SquadExportItem>;
export declare const agentTeamExportSchema: z.ZodType<AgentTeamExportDocument>;
/**
 * Recipe v1 predates the v2 definition ceilings. Keep it able to round-trip
 * an upgraded legacy squad (for example 33 members), while bounding the one-
 * team document globally and leaving ordinary CRUD on the strict schemas.
 */
export declare const agentTeamRecipeSchema: z.ZodType<AgentTeamRecipeDocument>;
/** Durable session-to-squad mode selection. */
export declare const sessionSquadModeSchema: z.ZodType<SessionSquadModeRecord>;
/** One-shot selection is deliberately separate from the durable session override. */
export declare const sessionNextSquadModeSchema: z.ZodType<SessionNextSquadModeRecord>;
export declare const squadMessageClaimSchema: z.ZodType<SquadMessageClaimRecord>;
/** Durable run-center row; output blocks remain provider-neutral JSON. */
export declare const squadRunRecordSchema: z.ZodType<SquadRunRecord>;
export declare const squadVersionRecordSchema: z.ZodType<SquadVersionRecord>;
export declare const projectSquadDefaultRecordSchema: z.ZodType<ProjectSquadDefaultRecord>;
/** One versioned domain containing both definition tables. */
export declare const agentTeamDomainSpec: {
    name: string;
    version: number;
    tables: {
        agents: import("@deepseek-ai/dsh-storage-domain").DomainTableSpec<AgentId, AgentRecord>;
        squads: import("@deepseek-ai/dsh-storage-domain").DomainTableSpec<SquadId, SquadRecord>;
        session_modes: import("@deepseek-ai/dsh-storage-domain").DomainTableSpec<SessionId, SessionSquadModeRecord>;
        next_modes: import("@deepseek-ai/dsh-storage-domain").DomainTableSpec<SessionId, SessionNextSquadModeRecord>;
        message_claims: import("@deepseek-ai/dsh-storage-domain").DomainTableSpec<string, SquadMessageClaimRecord>;
        runs: import("@deepseek-ai/dsh-storage-domain").DomainTableSpec<DispatchId, SquadRunRecord>;
        squad_versions: import("@deepseek-ai/dsh-storage-domain").DomainTableSpec<string, SquadVersionRecord>;
        project_defaults: import("@deepseek-ai/dsh-storage-domain").DomainTableSpec<string, ProjectSquadDefaultRecord>;
    };
};
//# sourceMappingURL=spec.d.ts.map