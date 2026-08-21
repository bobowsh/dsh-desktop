import { type ReactNode } from 'react';
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import { AgentTeamController } from './controller.ts';
export interface TeamSettingsInjected {
    controller: AgentTeamController;
}
export type TeamSettingsPageProps = PropsRuntime<'settings.section'> & InjectFace<TeamSettingsInjected>;
/** Three-view settings workspace with selected editors and guarded, sticky actions. */
export declare function TeamSettingsPage(props: TeamSettingsPageProps): ReactNode;
//# sourceMappingURL=SettingsPage.d.ts.map