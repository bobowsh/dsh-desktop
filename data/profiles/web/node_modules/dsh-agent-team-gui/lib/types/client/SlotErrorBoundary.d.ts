import { Component, type ErrorInfo, type ReactNode } from 'react';
import type { AgentTeamController } from './controller.ts';
interface SlotErrorBoundaryProps {
    controller: AgentTeamController;
    testId: string;
    children: ReactNode;
}
interface SlotErrorBoundaryState {
    error: string;
}
/** Keeps a malformed Host payload or unexpected render defect inside this plugin's slot. */
export declare class SlotErrorBoundary extends Component<SlotErrorBoundaryProps, SlotErrorBoundaryState> {
    state: SlotErrorBoundaryState;
    static getDerivedStateFromError(reason: unknown): SlotErrorBoundaryState;
    componentDidCatch(_reason: unknown, _info: ErrorInfo): void;
    private readonly retry;
    render(): ReactNode;
}
export {};
//# sourceMappingURL=SlotErrorBoundary.d.ts.map