/** Loopback-only Host RPC adapter for the Automation Web client. */
import type { AutomationService } from './service.ts';
interface RpcContext {
    readonly connection: {
        readonly rpc: {
            handle(channel: string, handler: (endpoint: string, payload: unknown, signal: AbortSignal) => Promise<unknown>, options: {
                readonly authority: 'loopback' | 'trusted-host';
            }): () => Promise<void>;
        };
    };
}
/** Register the channel as loopback-only because it controls unattended writes. */
export declare function registerAutomationRpc(ctx: RpcContext, service: AutomationService): () => Promise<void>;
export {};
