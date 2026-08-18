import type { AutomationViewProps, Translate } from './contracts.js';
import type { AutomationRunViewModel } from './protocol.js';
export declare function RecentRun({ run, now, t, busy, onOpen, onMarkRead }: {
    run: AutomationRunViewModel;
    now: Date;
    t: Translate;
    busy: boolean;
    onOpen: (runId: string, sessionId: string) => void;
    onMarkRead: (runId: string) => void;
}): JSX.Element;
/** Native conversation view: all data and effects arrive through the slot's four shares. */
export declare function AutomationView({ t, useAutomationState, refresh, createAutomation, updateAutomation, mutateAutomation, runNow, markRunRead, openSession, }: AutomationViewProps): JSX.Element;
