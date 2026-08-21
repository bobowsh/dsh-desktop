import { type ReactNode } from 'react';
import type { TeamSnapshot } from './contracts.ts';
import type { AgentTeamController } from './controller.ts';
import type { Translate } from './i18n.ts';
export interface RecipesWorkspaceProps {
    controller: AgentTeamController;
    data: TeamSnapshot;
    busy: boolean;
    t: Translate;
    run(action: () => Promise<void>): Promise<boolean>;
    setNotice(value: string): void;
}
/** Portable recipe and definition-backup workflows, isolated from the catalog editors. */
export declare function RecipesWorkspace({ controller, data, busy, t, run, setNotice }: RecipesWorkspaceProps): ReactNode;
//# sourceMappingURL=RecipesWorkspace.d.ts.map