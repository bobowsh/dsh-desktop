import type { Translate } from './contracts.js';
import type { AutomationSchedule, AutomationSnapshot, CreateAutomationInput } from './protocol.js';
export type ScheduleKind = 'once' | 'interval' | 'daily' | 'weekly';
export interface AutomationFormState {
    readonly name: string;
    readonly prompt: string;
    readonly scheduleKind: ScheduleKind;
    readonly onceAt: string;
    readonly everyMinutes: string;
    readonly time: string;
    readonly weekdays: readonly number[];
    readonly timeZone: string;
    readonly permission: CreateAutomationInput['permission'];
}
export type FormErrorKey = 'form.error.name' | 'form.error.prompt' | 'form.error.once' | 'form.error.interval' | 'form.error.weekdays';
export declare class AutomationFormError extends Error {
    readonly key: FormErrorKey;
    constructor(key: FormErrorKey);
}
export declare function localDateTimeValue(date?: Date): string;
export declare function defaultFormState(now?: Date): AutomationFormState;
export declare function buildCreateInput(form: AutomationFormState, now?: Date): CreateAutomationInput;
export interface OverviewStats {
    readonly total: number;
    readonly active: number;
    readonly attention: number;
    readonly nextRunAt?: string;
}
export declare function deriveOverview(snapshot: AutomationSnapshot): OverviewStats;
export declare function formatRelativeTime(iso: string, now: Date, t: Translate): string;
export declare function shortSessionId(sessionId: string): string;
export declare function formatSchedule(schedule: AutomationSchedule, t: Translate): string;
