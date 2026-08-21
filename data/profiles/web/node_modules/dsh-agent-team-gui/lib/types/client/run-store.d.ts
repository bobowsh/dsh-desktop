import type { RunView } from './contracts.ts';
import { RunGateway } from './controller.ts';
export interface RunStoreSnapshot {
    runs: RunView[];
    status: 'idle' | 'loading' | 'ready' | 'error';
    error: string;
    revision: number;
}
/** Polling lifecycle isolated from React. A live run uses a short cadence; settled history backs off. */
export declare class RunPollStore {
    private readonly gateway;
    readonly sessionId: string;
    readonly limit: number;
    private state;
    private readonly listeners;
    private timer;
    private generation;
    private detailId;
    constructor(gateway: RunGateway, sessionId: string, limit?: number);
    readonly getSnapshot: () => RunStoreSnapshot;
    readonly subscribe: (listener: () => void) => (() => void);
    refresh(): void;
    watchDetail(id: string | null): void;
    replaceRun(run: RunView): void;
    private start;
    private refreshRuns;
    private stop;
    private publish;
}
//# sourceMappingURL=run-store.d.ts.map