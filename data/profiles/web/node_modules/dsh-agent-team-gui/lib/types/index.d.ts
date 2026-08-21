import { Service, type Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { ExecutionApplicationService } from './tools/application/execution-service.ts';
import type { AgentTeamConfig } from './tools/domain/host.ts';
export * from './types.ts';
export { AgentTeamError } from './tools/domain/host.ts';
export type Config = AgentTeamConfig;
export { agentExportItemSchema, agentRecordSchema, agentTeamDomainSpec, agentTeamExportSchema, agentTeamRecipeSchema, sessionNextSquadModeSchema, sessionSquadModeSchema, squadExportItemSchema, squadRecordSchema } from './spec.ts';
export { createDispatchToSquadTool } from './tools/dispatch-to-squad.ts';
export { AGENT_TEAM_RPC_CHANNEL, createAgentTeamRpcHandler } from './rpc.ts';
/**
 * Cordis composition root and public facade. Definition/versioning and
 * execution use cases live in dedicated application services inherited here;
 * this class only wires official Harness seams and the conversation hook.
 */
export declare class AgentTeamService extends ExecutionApplicationService {
    static inject: string[];
    static Config: z<AgentTeamConfig>;
    constructor(ctx: Context, config: AgentTeamConfig);
    protected [Service.init](): Promise<void>;
    private registerConversationOrchestration;
}
export default AgentTeamService;
declare module '@deepseek-ai/cordis' {
    interface Context {
        agentTeamGui: AgentTeamService;
    }
}
declare module '@deepseek-ai/dsh-jobs' {
    interface JobKindMap {
        'agent-team': 'agent-team';
    }
}
//# sourceMappingURL=index.d.ts.map