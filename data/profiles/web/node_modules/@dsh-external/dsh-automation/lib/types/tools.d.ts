/** Agent-scoped management tools over the host-wide AutomationService. */
import type { AutomationService } from './service.ts';
interface ToolAgent {
    readonly id: string;
    readonly ctx: {
        readonly tools: {
            register(definition: unknown): () => void;
        };
    };
}
/** Install tools once into one exact root Agent scope. */
export declare function registerAutomationTools(service: AutomationService, agent: ToolAgent): () => void;
export {};
