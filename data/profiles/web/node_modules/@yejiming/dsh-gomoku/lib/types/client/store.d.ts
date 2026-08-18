/**
 * Gomoku browser-half store: module-level game/settings state plus the AI
 * move lifecycle. Living outside React means the conversation view can
 * unmount (tab switches) without resetting the game or interrupting an
 * in-flight AI move — the game and AI thinking continue in the background,
 * exactly the plugin's "弹窗关闭不中断对局" contract, now applied to tab
 * switches. The view subscribes via useSyncExternalStore.
 */
import { EMPTY, type Board, type Cell, type GameMode, type Thinking } from './game.ts';
/** One entry in the per-move reasoning log. */
export interface ReasoningEntry {
    /** Move number (1-based). */
    n: number;
    /** The side the AI played. */
    side: 'black' | 'white';
    /** The chosen intersection as "r,c", or null when the move failed. */
    move: string | null;
    /** The model's reasoning text for this attempt. */
    reasoning: string;
    /** The failure message when this attempt did not produce a move. */
    error?: string;
    /** True when the request was cut off (aborted/timed out) mid-thought. */
    interrupted?: boolean;
}
/** The playable game state (board, turn, outcome, log). */
export interface GameState {
    board: Board;
    /** Whose turn it is (BLACK opens). */
    turn: Cell;
    /** The winning side, or EMPTY while the game runs. */
    winner: Cell | typeof EMPTY;
    /** True when the board is full with no winner. */
    draw: boolean;
    /** True while an AI move request is in flight. */
    thinking: boolean;
    /** True in manual-takeover (pause) mode: AI requests are cut off and the
     *  human plays both sides until the pause is released. */
    paused: boolean;
    /** The last played intersection (win-marker highlight). */
    lastMove: {
        row: number;
        col: number;
    } | null;
    /** The reasoning log, newest last. */
    log: ReasoningEntry[];
    /** Played stones so far (for log labels). */
    moveCount: number;
}
/** One provider group from the node half's model catalog. */
export interface ModelGroup {
    provider: string;
    displayName: string;
    models: {
        id: string;
        name: string;
    }[];
}
/** One side's model selection (provider route + model id). */
export interface SideModel {
    provider: string | undefined;
    model: string | undefined;
}
/** The user-adjustable settings, kept across tab switches. */
export interface SettingsState {
    mode: GameMode;
    /** The model used when the AI plays black (white-side human games, both-mode). */
    blackModel: SideModel;
    /** The model used when the AI plays white (black-side human games, both-mode). */
    whiteModel: SideModel;
    /** The AI thinking level when the AI plays black. */
    blackThinking: Thinking;
    /** The AI thinking level when the AI plays white. */
    whiteThinking: Thinking;
    /** Fixed per-move deadline; not user-adjustable (see DEFAULT_MOVE_TIMEOUT_MS). */
    moveTimeoutMs: number;
    /** Fixed per-move output-token cap; not user-adjustable (see DEFAULT_MAX_MOVE_OUTPUT_TOKENS). */
    maxMoveOutputTokens: number;
    /** Black's custom system prompt; undefined uses the node half's default. */
    blackPrompt: string | undefined;
    /** White's custom system prompt; undefined uses the node half's default. */
    whitePrompt: string | undefined;
    groups: ModelGroup[];
    modelsError: string | undefined;
}
/** The fixed per-move deadline in milliseconds (3000 seconds; not user-adjustable). */
export declare const DEFAULT_MOVE_TIMEOUT_MS = 3000000;
/** The fixed per-move output-token cap (not user-adjustable). */
export declare const DEFAULT_MAX_MOVE_OUTPUT_TOKENS = 32000;
/** The whole store snapshot the view subscribes to. */
export interface Snapshot {
    game: GameState;
    settings: SettingsState;
}
/** A fresh empty board. */
export declare function emptyBoard(): Board;
/** Subscribe to store changes (useSyncExternalStore's subscribe). */
export declare function subscribe(listener: () => void): () => void;
/** The current stable snapshot (useSyncExternalStore's getSnapshot). */
export declare function getSnapshot(): Snapshot;
/** Fetch the model catalog once; failures surface in settings.modelsError. */
export declare function loadModels(): void;
/** Start a new game in the given mode (or the current one), opening with AI when required. */
export declare function newGame(mode?: GameMode): void;
/** Switch the play mode and restart the game in it. */
export declare function changeMode(mode: GameMode): void;
/** Human click on an empty intersection. While paused the human may play
 * either side (turn order still alternates, no move-count limit); otherwise
 * only the human's own side accepts clicks. */
export declare function placeStone(row: number, col: number): void;
/**
 * Toggle manual-takeover (pause) mode. Pausing cuts off any in-flight AI
 * move (the board stays fully playable for both sides, and the interrupted
 * request's catch path only records a log entry — it can never touch the
 * board, because the pause commit already cleared the thinking flag).
 * Releasing the pause hands the turn back to the AI when it is the AI's side.
 */
export declare function togglePause(): void;
/** Apply one settings patch (model selection, thinking, overrides, prompt). */
export declare function patchSettings(patch: Partial<SettingsState>): void;
/**
 * Retry the current move: re-run the AI move for the side whose last attempt
 * failed (the board is unchanged and it is that side's turn). A no-op while
 * the game is settled, a request is in flight, the game is paused (manual
 * play owns the board), or it is the human's turn (the human can simply
 * click the board).
 */
export declare function retryMove(): void;
