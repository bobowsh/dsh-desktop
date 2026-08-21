/**
 * Workspace-confined path resolution and durable-write helpers shared by all
 * seven Office tools.
 *
 * Every tool binds to the CALLING agent's session cwd (the authoritative
 * `session.header.cwd`) — the model never gets to pick a root. Relative paths
 * resolve against that cwd, absolute paths are accepted only when they stay
 * inside it, and a realpath check on the nearest existing ancestor closes the
 * symlink escape hatch.
 */
import type { ToolRunContext } from '@deepseek-ai/dsh-tools';
/** Hard cap for reading an existing Office file into memory. */
export declare const MAX_OFFICE_FILE_BYTES: number;
/** Cap for text materialized into a single tool result. */
export declare const MAX_TEXT_CHARS = 200000;
/** Cap for worksheet cells materialized into a single tool result. */
export declare const MAX_READ_CELLS = 200000;
/** Cap for worksheet cells accepted by one create/update call. */
export declare const MAX_WRITE_CELLS = 200000;
export interface ResolvedOfficePath {
    /** The path exactly as the model passed it. */
    input: string;
    /** Absolute path used for every fs operation. */
    absolute: string;
    /** Path rendered back to the model (workspace-relative when possible). */
    display: string;
    /** Lowercased extension including the leading dot. */
    ext: string;
}
/**
 * Resolve one model-supplied path to a workspace-confined absolute file path.
 *
 * @param exec - the running tool call (carries the session cwd + abort signal).
 * @param rawPath - the model-supplied path string.
 * @param allowedExts - acceptable lowercased extensions WITH dots (e.g. `.docx`).
 * @param mustExist - when true, stat the file and reject directories.
 */
export declare function resolveOfficePath(exec: ToolRunContext, rawPath: string, allowedExts: readonly string[], mustExist: boolean): Promise<ResolvedOfficePath>;
/**
 * Read a bounded Office file into memory, observing tool-call cancellation.
 */
export declare function readOfficeBuffer(path: string, signal: AbortSignal): Promise<{
    buffer: Buffer;
    sizeBytes: number;
}>;
/**
 * Write a buffer through a same-directory temp file + rename so a failed
 * generation never leaves a half-written Office document behind.
 */
export declare function atomicWriteFile(path: string, buffer: Buffer): Promise<number>;
/**
 * Reject an overwrite when `overwrite` is false and the target already exists.
 * Callers use this BEFORE doing expensive generation so the model gets a fast
 * refusal instead of wasted work.
 */
export declare function assertMayCreate(path: string, overwrite: boolean): Promise<void>;
