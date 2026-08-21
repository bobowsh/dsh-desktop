/** agent_team_gui 浏览器入口：Settings 小队页 + 输入区小队模式。 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
/** 浏览器侧依赖；模块加载器会在这些服务就绪后调用 apply。 */
export declare const inject: string[];
/** agent_team_gui 使用的独立 Connection RPC channel。 */
export declare const RPC_CHANNEL = "/agent-team-gui";
/** 将管理页和会话模式控件贡献到 dsh 的既有 additive slots。 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map