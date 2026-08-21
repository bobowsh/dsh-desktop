import { type ReactNode } from 'react';
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import { AgentTeamController } from './controller.ts';
export interface TeamRunInjected {
    controller: AgentTeamController;
}
export type TeamRunCenterProps = PropsRuntime<'conversation.view'> & InjectFace<TeamRunInjected>;
export type TeamRunDockProps = PropsRuntime<'conversation.input.dock'> & InjectFace<TeamRunInjected>;
/** Run history, DAG stages, usage, retry, export, clearing, and aggregate insights. */
export declare function TeamRunCenter(props: TeamRunCenterProps): ReactNode;
/** Compact live progress control with keyboard-accessible inline actions. */
export declare function TeamRunDock(props: TeamRunDockProps): ReactNode;
/** DSH has no public imperative conversation-view selection service yet; use the host's semantic tab. */
export declare function openRunCenter(): void;
//# sourceMappingURL=RunCenter.d.ts.map