import type { ClientContext } from './contracts.js';
export declare const name = "dsh-automation-client";
export declare const inject: string[];
/** Register one native Automations tab into DSH's session-scoped view ring. */
export declare function apply(ctx: ClientContext): void;
