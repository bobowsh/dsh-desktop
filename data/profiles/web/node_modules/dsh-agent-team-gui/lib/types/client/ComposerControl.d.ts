import { type ReactNode } from 'react';
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import { AgentTeamController } from './controller.ts';
export interface TeamComposerInjected {
    controller: AgentTeamController;
}
export type TeamComposerControlProps = PropsRuntime<'conversation.input.right'> & InjectFace<TeamComposerInjected>;
/** Accessible, native-style mode entry. The panel exposes every durable and one-shot state. */
export declare function TeamComposerControl(props: TeamComposerControlProps): ReactNode;
/**
 * DSH currently exposes no public imperative "open this settings section" service.
 * Invoke its semantic, accessible controls instead of depending on CSS classes or
 * private component state. If the shell changes, the panel remains useful and the
 * user-visible Settings → Teams path still works.
 */
export declare function openTeamSettings(): void;
//# sourceMappingURL=ComposerControl.d.ts.map