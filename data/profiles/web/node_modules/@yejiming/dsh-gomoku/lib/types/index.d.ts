/**
 * Gomoku (five-in-a-row) node half for the dsh web GUI. The plugin owns three
 * routes under `/plugins/gomoku`:
 *
 * - `GET  /plugins/gomoku/prompt`  — the default system prompt (game rules,
 *   strict return format, and worked examples). The browser half fetches it to
 *   show and to restore, so the rules text lives in exactly one place.
 * - `GET  /plugins/gomoku/models`  — the model catalog (registered provider
 *   routes and their models) for the side-model selectors.
 * - `POST /plugins/gomoku/move`    — frame the board into a single-shot LLM
 *   request through the chosen provider/model route (optionally with a
 *   thinking level and per-request timeout/token overrides), parse and
 *   validate the reply, and return the chosen intersection plus the model's
 *   reasoning text. Transient stream failures (a dropped connection, a
 *   provider rate limit) retry within the attempt budget before the request
 *   gives up.
 *
 * The board itself (state, turn order, win detection) lives in the browser
 * half; this plugin only arbitrates AI moves, so a malformed or illegal model
 * reply is rejected here and can never corrupt the client-side board.
 *
 * The game is freestyle gomoku (no forbidden moves): black may play double
 * threes, double fours, and overlines freely — any five-in-a-row or longer
 * wins. That rule, the return format, the blocking/attack tactics, and the
 * correct examples are all spelled out in {@link DEFAULT_SYSTEM_PROMPT};
 * users may hand-edit the prompt in the UI, in which case the edited text is
 * sent verbatim as the system prompt.
 * @module @yejiming/dsh-gomoku
 */
import type { Context } from '@deepseek-ai/cordis';
import z from 'schemastery';
import type { Message } from '@deepseek-ai/dsh-llm';
/** Cordis plugin name (diagnostics only). */
export declare const name = "gomoku";
/** Services required before the board routes can mount. */
export declare const inject: string[];
/** Board edge length in intersections (standard freestyle gomoku board). */
export declare const BOARD_SIZE = 15;
/** Empty intersection. */
export declare const EMPTY = 0;
/** Black stone (moves first). */
export declare const BLACK = 1;
/** White stone (moves second). */
export declare const WHITE = 2;
/** The side an AI move request plays for. */
export type GomokuSide = 'black' | 'white';
/** The AI thinking level for one move request (wire spelling). */
export type GomokuThinking = 'off' | 'high' | 'max';
/** Required plugin configuration. */
export interface Config {
    /** End-to-end deadline for one AI move attempt, in milliseconds. */
    moveTimeoutMs: number;
    /** Output-token cap for one AI move reply. */
    maxMoveOutputTokens: number;
    /** Total AI move attempts per request (1 = no retry); the last attempt carries corrective feedback. */
    maxMoveAttempts: number;
}
/** Loader schema with deployment defaults (no library defaults). */
export declare const Config: z<Config>;
/** Route prefix owned by this plugin (the browser half calls under it). */
export declare const GOMOKU_PATH = "/plugins/gomoku";
/**
 * The default system prompt: freestyle (no forbidden moves) gomoku rules,
 * terminology with JSON demonstrations (live twos, threes, sleep threes,
 * fours, double live threes, four-three kills, key defensive points, five),
 * the strict JSON return format, a mandatory pre-move thinking flow
 * (enumerate own fours, block opponent fours, list live-three candidates,
 * evaluate 3-5 candidates, pick the best), basic tactics each with a worked
 * return case, high-level few-shot games showing the full threat-enumeration
 * → candidate-analysis → judgment process, and an explicit wrong example.
 * Users may edit this text in the browser half; the edited text replaces it
 * verbatim per move request.
 */
export declare const DEFAULT_SYSTEM_PROMPT: string;
/** The wire shape of one model group served to the browser half. */
export interface ModelGroupWire {
    /** Provider route key (passed back as the move request's `provider`). */
    provider: string;
    /** Human-readable provider name. */
    displayName: string;
    /** The provider's selectable models. */
    models: {
        id: string;
        name: string;
    }[];
}
/** One provider whose model listing failed (the sound groups still serve). */
export interface ModelFailureWire {
    provider: string;
    error: string;
}
/** A parsed AI move reply (before board legality is checked). */
export type MoveReply = {
    kind: 'move';
    row: number;
    col: number;
} | {
    kind: 'draw';
} | {
    kind: 'error';
    message: string;
} | {
    kind: 'invalid';
    reason: string;
};
/** The validated move-request wire body. */
export interface MoveRequestBody {
    /** Registered provider route key. */
    provider: string;
    /** Model id the provider accepts. */
    model: string;
    /** The side the AI plays in this request. */
    side: GomokuSide;
    /** BOARD_SIZE² cells in row-major order: 0 empty, 1 black, 2 white. */
    board: number[];
    /** Custom system prompt; empty or absent falls back to the default. */
    system?: string;
    /**
     * AI thinking level; forwarded only when the selected model advertises
     * that effort, otherwise the model's own default applies.
     */
    thinking?: GomokuThinking;
    /** Per-request deadline override (milliseconds); absent uses the config default. */
    moveTimeoutMs?: number;
    /** Per-request output-token cap override; absent uses the config default. */
    maxMoveOutputTokens?: number;
}
/**
 * Whether an intersection is inside the board and currently empty.
 * @param board - row-major cell values (length must be BOARD_SIZE²).
 * @param row - intersection row.
 * @param col - intersection column.
 * @returns true when the move may be played.
 */
export declare function isLegalMove(board: readonly number[], row: number, col: number): boolean;
/**
 * Render the board as the 16-line labeled text the prompt describes: a
 * column-number header (digits aligned over their columns) followed by one
 * line per row, each prefixed with its row number, one character per
 * intersection.
 * @param board - row-major cell values (length must be BOARD_SIZE²).
 * @returns the labeled board text.
 */
export declare function boardText(board: readonly number[]): string;
/**
 * Parse and shape-check one model reply into a {@link MoveReply}. The reply
 * may wrap the JSON in prose or a code fence (models do), so the object
 * region is extracted before parsing; the move coordinates themselves are
 * still strictly validated here.
 * @param text - the assembled model reply text.
 * @returns the parsed reply.
 */
export declare function parseMoveReply(text: string): MoveReply;
/**
 * Whether a thrown move-stream failure is transient and worth one retry.
 * @param error - the error thrown by {@link streamMoveText}.
 * @returns true when the failure carries one of the retryable codes.
 */
export declare function isRetryableMoveFailure(error: unknown): boolean;
/**
 * Validate an untrusted move-request body into a typed request.
 * @param value - the parsed request body.
 * @returns the validated request.
 * @throws {Error} with a user-readable reason on the first invalid field.
 */
export declare function validateMoveRequest(value: unknown): MoveRequestBody;
/** Frame the user message for one move attempt (board + side + optional corrective feedback). */
export declare function buildMoveUserMessage(request: MoveRequestBody, previous: string | undefined, reason: string | undefined): Message;
/**
 * Mount the gomoku plugin: the three routes plus the move-request lifecycle.
 * @param ctx - host cordis context.
 * @param config - validated loader configuration.
 */
export declare function apply(ctx: Context, config: Config): void;
