/**
 * Gomoku browser-half game core: pure board state helpers (no React, no
 * services). The board itself (state, turn order, win detection) lives in
 * the browser half per the plugin's architecture; this module is the single
 * source of truth both for rendering and for framing AI move requests.
 */
/** Board edge length in intersections (standard freestyle gomoku board). */
export declare const BOARD_SIZE = 15;
/** Empty intersection. */
export declare const EMPTY = 0;
/** Black stone (moves first). */
export declare const BLACK = 1;
/** White stone (moves second). */
export declare const WHITE = 2;
/** A board cell value. */
export type Cell = typeof EMPTY | typeof BLACK | typeof WHITE;
/** The side an AI move request plays for. */
export type GomokuSide = 'black' | 'white';
/** The side the human plays; 'both' means AI vs AI. */
export type GameMode = 'black' | 'white' | 'both';
/** The AI thinking level for one move request (wire spelling). */
export type Thinking = 'off' | 'high' | 'max';
/** A 15×15 board in row-major order. */
export type Board = readonly Cell[];
/** A legal 15×15 board is exactly BOARD_SIZE² cells. */
export declare const CELL_COUNT: number;
/** The board center intersection (天元): black's opening move is pinned here. */
export declare const TENGEN: {
    readonly row: 7;
    readonly col: 7;
};
/** The AI move request wire body (mirrors the node half's validateMoveRequest). */
export interface MoveRequest {
    /** Registered provider route key. */
    provider: string;
    /** Model id the provider accepts. */
    model: string;
    /** The side the AI plays in this request. */
    side: GomokuSide;
    /** BOARD_SIZE² cells in row-major order: 0 empty, 1 black, 2 white. */
    board: number[];
    /** Custom system prompt; absent falls back to the node half's default. */
    system?: string;
    /** AI thinking level; forwarded only when the selected model advertises it. */
    thinking?: Thinking;
    /** Per-request deadline override (milliseconds). */
    moveTimeoutMs?: number;
    /** Per-request output-token cap override. */
    maxMoveOutputTokens?: number;
}
/** The AI move reply wire body (one of move / draw / error). */
export interface MoveResponse {
    /** The chosen intersection, when the AI produced a legal move. */
    move?: {
        row: number;
        col: number;
    };
    /** True when the AI declared the game drawn. */
    draw?: boolean;
    /** A failure message (validation, AI-reported, or exhausted attempts). */
    error?: string;
    /** The model's reasoning text for this attempt, when present. */
    reasoning?: string;
}
/**
 * Whether an intersection is inside the board and currently empty.
 * @param board - row-major cell values (length must be CELL_COUNT).
 * @param row - intersection row.
 * @param col - intersection column.
 * @returns true when the move may be played.
 */
export declare function isLegalMove(board: Board, row: number, col: number): boolean;
/** Whether any empty intersection remains. */
export declare function hasEmpty(board: Board): boolean;
/**
 * Whether the stone at (row, col) completes a freestyle win: five or more
 * consecutive stones of the same color along any of the four directions
 * (overlines count — this game has no forbidden moves).
 * @param board - row-major cell values.
 * @param row - the intersection just played.
 * @param col - the intersection just played.
 * @returns true when the placed stone wins the game.
 */
export declare function winsAt(board: Board, row: number, col: number): boolean;
/**
 * Post one AI move request to the node half's route.
 * @param body - the validated move request.
 * @param signal - optional abort (request teardown).
 * @returns the parsed reply.
 * @throws {Error} with the node half's error message on a non-OK status.
 */
export declare function requestAiMove(body: MoveRequest, signal?: AbortSignal): Promise<MoveResponse>;
