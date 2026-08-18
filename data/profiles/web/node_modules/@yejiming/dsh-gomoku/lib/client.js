window.__ModuleLoader__.load({
	id: "@yejiming/dsh-gomoku",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		/** The board center intersection (天元): black's opening move is pinned here. */
		const TENGEN = {
			row: 7,
			col: 7
		};
		/**
		* Whether an intersection is inside the board and currently empty.
		* @param board - row-major cell values (length must be CELL_COUNT).
		* @param row - intersection row.
		* @param col - intersection column.
		* @returns true when the move may be played.
		*/
		function isLegalMove(board, row, col) {
			return row >= 0 && row < 15 && col >= 0 && col < 15 && board[row * 15 + col] === 0;
		}
		/** Whether any empty intersection remains. */
		function hasEmpty(board) {
			return board.includes(0);
		}
		/** The four line directions scanned for a win. */
		const DIRECTIONS = [
			[0, 1],
			[1, 0],
			[1, 1],
			[1, -1]
		];
		/**
		* Whether the stone at (row, col) completes a freestyle win: five or more
		* consecutive stones of the same color along any of the four directions
		* (overlines count — this game has no forbidden moves).
		* @param board - row-major cell values.
		* @param row - the intersection just played.
		* @param col - the intersection just played.
		* @returns true when the placed stone wins the game.
		*/
		function winsAt(board, row, col) {
			const color = board[row * 15 + col];
			if (color === 0) return false;
			for (const [dr, dc] of DIRECTIONS) {
				let count = 1;
				for (const step of [1, -1]) {
					let r = row + dr * step;
					let c = col + dc * step;
					while (r >= 0 && r < 15 && c >= 0 && c < 15 && board[r * 15 + c] === color) {
						count += 1;
						r += dr * step;
						c += dc * step;
					}
				}
				if (count >= 5) return true;
			}
			return false;
		}
		/**
		* Post one AI move request to the node half's route.
		* @param body - the validated move request.
		* @param signal - optional abort (request teardown).
		* @returns the parsed reply.
		* @throws {Error} with the node half's error message on a non-OK status.
		*/
		async function requestAiMove(body, signal) {
			const response = await fetch("/plugins/gomoku/move", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body),
				signal
			});
			const parsed = await response.json();
			if (!response.ok) throw new Error(typeof parsed.error === "string" ? parsed.error : `gomoku: HTTP ${response.status}`);
			return parsed;
		}
		//#endregion
		//#region src/client/store.ts
		/**
		* Gomoku browser-half store: module-level game/settings state plus the AI
		* move lifecycle. Living outside React means the conversation view can
		* unmount (tab switches) without resetting the game or interrupting an
		* in-flight AI move — the game and AI thinking continue in the background,
		* exactly the plugin's "弹窗关闭不中断对局" contract, now applied to tab
		* switches. The view subscribes via useSyncExternalStore.
		*/
		/** The fixed per-move deadline in milliseconds (3000 seconds; not user-adjustable). */
		const DEFAULT_MOVE_TIMEOUT_MS = 3e6;
		/** The fixed per-move output-token cap (not user-adjustable). */
		const DEFAULT_MAX_MOVE_OUTPUT_TOKENS = 32e3;
		/** A fresh empty board. */
		function emptyBoard() {
			return new Array(225).fill(0);
		}
		/** The fresh game state for a new game. */
		function freshGame() {
			return {
				board: emptyBoard(),
				turn: 1,
				winner: 0,
				draw: false,
				thinking: false,
				paused: false,
				lastMove: null,
				log: [],
				moveCount: 0
			};
		}
		/** The default settings (models fill in from the catalog fetch). */
		function freshSettings() {
			return {
				mode: "black",
				blackModel: {
					provider: void 0,
					model: void 0
				},
				whiteModel: {
					provider: void 0,
					model: void 0
				},
				blackThinking: "off",
				whiteThinking: "off",
				moveTimeoutMs: DEFAULT_MOVE_TIMEOUT_MS,
				maxMoveOutputTokens: DEFAULT_MAX_MOVE_OUTPUT_TOKENS,
				blackPrompt: void 0,
				whitePrompt: void 0,
				groups: [],
				modelsError: void 0
			};
		}
		let snapshot = {
			game: freshGame(),
			settings: freshSettings()
		};
		const listeners = /* @__PURE__ */ new Set();
		/** Game generation: bumped on every new game; stale async results are dropped. */
		let generation = 0;
		/** The in-flight move request's abort handle (cancelled on new game / teardown). */
		let abort = null;
		/** Subscribe to store changes (useSyncExternalStore's subscribe). */
		function subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		}
		/** The current stable snapshot (useSyncExternalStore's getSnapshot). */
		function getSnapshot() {
			return snapshot;
		}
		/** Whether the side belongs to the human in this mode. */
		function isHumanTurn(mode, turn) {
			return mode === "black" && turn === 1 || mode === "white" && turn === 2;
		}
		/** Whether the side belongs to the AI in this mode. */
		function isAiTurn(mode, turn) {
			return mode === "both" || mode === "black" && turn === 2 || mode === "white" && turn === 1;
		}
		/** The AI wire side spelling for a cell color. */
		function sideOf(turn) {
			return turn === 1 ? "black" : "white";
		}
		/** Whether the game has settled (win or draw). */
		function gameOver(game) {
			return game.winner !== 0 || game.draw;
		}
		/** Publish one game state to all subscribers. */
		function commitGame(game) {
			snapshot = {
				...snapshot,
				game
			};
			for (const listener of [...listeners]) listener();
		}
		/** Publish one settings state to all subscribers. */
		function commitSettings(settings) {
			snapshot = {
				...snapshot,
				settings
			};
			for (const listener of [...listeners]) listener();
		}
		/**
		* The pure place-transition: put the current turn's stone at (row, col) and
		* advance the game. Returns null when the move is illegal or the game is
		* settled; the caller commits the result. (The thinking flag is NOT a guard
		* here — callers own it; an AI reply arrives while thinking is still set.)
		*
		* Freestyle rules with one house rule: black's opening move (moveCount 0,
		* always black) must land on the tengen (board center) intersection.
		*/
		function placed(game, row, col) {
			if (gameOver(game)) return null;
			if (!isLegalMove(game.board, row, col)) return null;
			if (game.moveCount === 0 && game.turn === 1 && (row !== TENGEN.row || col !== TENGEN.col)) return null;
			const board = [...game.board];
			const color = game.turn;
			board[row * 15 + col] = color;
			const base = {
				...game,
				board,
				lastMove: {
					row,
					col
				},
				moveCount: game.moveCount + 1,
				turn: color === 1 ? 2 : 1
			};
			if (winsAt(board, row, col)) return {
				...base,
				winner: color
			};
			if (!hasEmpty(board)) return {
				...base,
				draw: true
			};
			return base;
		}
		/** Fetch the model catalog once; failures surface in settings.modelsError. */
		function loadModels() {
			if (snapshot.settings.groups.length > 0) return;
			fetch("/plugins/gomoku/models").then((response) => response.json()).then((body) => {
				const groups = body.groups ?? [];
				const next = {
					...snapshot.settings,
					groups,
					modelsError: void 0
				};
				if (groups.length > 0) {
					const first = groups[0];
					const defaultModel = first.models[0]?.id;
					if (next.blackModel.provider === void 0) next.blackModel = {
						provider: first.provider,
						model: defaultModel
					};
					if (next.whiteModel.provider === void 0) next.whiteModel = {
						provider: first.provider,
						model: defaultModel
					};
				}
				commitSettings(next);
			}).catch((error) => {
				if (snapshot.settings.groups.length > 0) return;
				commitSettings({
					...snapshot.settings,
					modelsError: error instanceof Error ? error.message : String(error)
				});
			});
		}
		/** Start a new game in the given mode (or the current one), opening with AI when required. */
		function newGame(mode) {
			generation += 1;
			abort?.abort();
			const nextMode = mode ?? snapshot.settings.mode;
			commitGame(freshGame());
			if (nextMode === "white" || nextMode === "both") scheduleAi();
		}
		/** Switch the play mode and restart the game in it. */
		function changeMode(mode) {
			if (mode === snapshot.settings.mode) return;
			commitSettings({
				...snapshot.settings,
				mode
			});
			newGame(mode);
		}
		/** Human click on an empty intersection. While paused the human may play
		* either side (turn order still alternates, no move-count limit); otherwise
		* only the human's own side accepts clicks. */
		function placeStone(row, col) {
			const { game, settings } = snapshot;
			if (gameOver(game) || game.thinking) return;
			if (!game.paused && !isHumanTurn(settings.mode, game.turn)) return;
			const next = placed(game, row, col);
			if (next === null) return;
			commitGame(next);
			if (!gameOver(next) && !next.paused && isAiTurn(settings.mode, next.turn)) scheduleAi();
		}
		/**
		* Toggle manual-takeover (pause) mode. Pausing cuts off any in-flight AI
		* move (the board stays fully playable for both sides, and the interrupted
		* request's catch path only records a log entry — it can never touch the
		* board, because the pause commit already cleared the thinking flag).
		* Releasing the pause hands the turn back to the AI when it is the AI's side.
		*/
		function togglePause() {
			const { game, settings } = snapshot;
			if (gameOver(game)) return;
			if (game.paused) {
				commitGame({
					...game,
					paused: false
				});
				if (isAiTurn(settings.mode, game.turn)) scheduleAi();
			} else {
				abort?.abort();
				commitGame({
					...game,
					paused: true,
					thinking: false
				});
			}
		}
		/** Apply one settings patch (model selection, thinking, overrides, prompt). */
		function patchSettings(patch) {
			commitSettings({
				...snapshot.settings,
				...patch
			});
		}
		/**
		* Retry the current move: re-run the AI move for the side whose last attempt
		* failed (the board is unchanged and it is that side's turn). A no-op while
		* the game is settled, a request is in flight, the game is paused (manual
		* play owns the board), or it is the human's turn (the human can simply
		* click the board).
		*/
		function retryMove() {
			const { game, settings } = snapshot;
			if (gameOver(game) || game.thinking || game.paused) return;
			if (!isAiTurn(settings.mode, game.turn)) return;
			scheduleAi();
		}
		/** Max AI attempts per move before the move fails (rejected moves retry). */
		const MAX_AI_ATTEMPTS = 3;
		/** The side model selection for one turn color. */
		function sideModelOf(settings, turn) {
			return turn === 1 ? settings.blackModel : settings.whiteModel;
		}
		/** The side thinking level for one turn color. */
		function sideThinkingOf(settings, turn) {
			return turn === 1 ? settings.blackThinking : settings.whiteThinking;
		}
		/** The side custom system prompt for one turn color (undefined = node default). */
		function sidePromptOf(settings, turn) {
			return turn === 1 ? settings.blackPrompt : settings.whitePrompt;
		}
		/**
		* How long past the node half's own deadline a request may stay silent
		* before the client declares the thinking interrupted (the node half answers
		* within moveTimeoutMs; only a dropped connection stays silent longer).
		*/
		const WATCHDOG_MARGIN_MS = 5e3;
		/** Per-request sequence: a settled reply only applies to the request it came from. */
		let requestSeq = 0;
		/** Run one AI move attempt for the current turn of the current game generation. */
		function scheduleAi(attempt = 1) {
			const { game, settings } = snapshot;
			if (gameOver(game) || game.thinking) return;
			const gen = generation;
			const turn = game.turn;
			const model = sideModelOf(settings, turn);
			if (model.provider === void 0 || model.model === void 0) {
				commitGame({
					...game,
					thinking: false,
					log: [...game.log, {
						n: game.moveCount + 1,
						side: sideOf(turn),
						move: null,
						reasoning: "",
						error: settings.modelsError ?? "model catalog unavailable"
					}]
				});
				return;
			}
			commitGame({
				...game,
				thinking: true
			});
			const controller = new AbortController();
			abort = controller;
			const seq = ++requestSeq;
			const watchdog = window.setTimeout(() => {
				if (gen === generation && seq === requestSeq) controller.abort();
			}, settings.moveTimeoutMs + WATCHDOG_MARGIN_MS);
			const system = sidePromptOf(settings, turn);
			requestAiMove({
				provider: model.provider,
				model: model.model,
				side: sideOf(turn),
				board: [...game.board],
				thinking: sideThinkingOf(settings, turn),
				moveTimeoutMs: settings.moveTimeoutMs,
				maxMoveOutputTokens: settings.maxMoveOutputTokens,
				...system !== void 0 ? { system } : {}
			}, controller.signal).then((reply) => {
				window.clearTimeout(watchdog);
				if (gen !== generation || seq !== requestSeq) return;
				applyAiReply(reply, turn, gen, attempt);
			}).catch((error) => {
				window.clearTimeout(watchdog);
				if (gen !== generation || seq !== requestSeq) return;
				const current = snapshot.game;
				if (current.turn !== turn) return;
				if (error?.name === "AbortError") {
					commitGame({
						...current,
						thinking: false,
						log: [...current.log, {
							n: current.moveCount + 1,
							side: sideOf(turn),
							move: null,
							reasoning: "",
							interrupted: true
						}]
					});
					return;
				}
				const message = error instanceof Error ? error.message : String(error);
				commitGame({
					...current,
					thinking: false,
					log: [...current.log, {
						n: current.moveCount + 1,
						side: sideOf(turn),
						move: null,
						reasoning: "",
						error: message
					}]
				});
			});
		}
		/** Apply one settled AI reply for the turn it was requested for. */
		function applyAiReply(reply, turn, gen, attempt) {
			const { game, settings } = snapshot;
			if (game.turn !== turn || !game.thinking) return;
			if (reply.move !== void 0) {
				const next = placed(game, reply.move.row, reply.move.col);
				if (next !== null) {
					const withLog = {
						...next,
						thinking: false,
						log: [...next.log, {
							n: next.moveCount,
							side: sideOf(turn),
							move: `${reply.move.row},${reply.move.col}`,
							reasoning: reply.reasoning ?? ""
						}]
					};
					commitGame(withLog);
					if (!gameOver(withLog) && isAiTurn(settings.mode, withLog.turn)) window.setTimeout(() => {
						if (gen === generation) scheduleAi();
					}, 350);
					return;
				}
				if (attempt < MAX_AI_ATTEMPTS) {
					commitGame({
						...game,
						thinking: false
					});
					window.setTimeout(() => {
						if (gen === generation) scheduleAi(attempt + 1);
					}, 200);
					return;
				}
			}
			if (reply.draw === true) {
				commitGame({
					...game,
					thinking: false,
					draw: true
				});
				return;
			}
			const error = reply.error ?? "unknown error";
			commitGame({
				...game,
				thinking: false,
				log: [...game.log, {
					n: game.moveCount + 1,
					side: sideOf(turn),
					move: null,
					reasoning: reply.reasoning ?? "",
					error
				}]
			});
		}
		//#endregion
		//#region \0dsh-css:/Users/yejiming/Desktop/OpenSource/dsh-gomoku/src/client/Gomoku.module.css.mjs
		const css = ".MXOHCW_view{box-sizing:border-box;--border:var(--dsw-alias-border-l2,#8080804d);--border-soft:var(--dsw-alias-border-l1,#80808029);--panel-bg:var(--dsw-alias-bg-module-platform,#8080800f);--well-bg:var(--dsw-alias-bg-layer-1,#80808012);--interactive-hover:var(--dsw-alias-interactive-bg-hover,#8080801f);--interactive-active:var(--dsw-alias-interactive-bg-active,#80808033);--label-primary:var(--dsw-alias-label-primary,inherit);--label-secondary:var(--dsw-alias-label-secondary,#808080c7);--label-tertiary:var(--dsw-alias-label-tertiary,#80808094);--error:var(--dsw-alias-state-error-primary,#e05252);--success:var(--dsw-alias-state-success-primary,#4caf50);--wood-base:oklch(74% .1 78);--grid-ink:oklch(32% .04 55/.6);--hoshi-ink:oklch(30% .04 50/.72);--stone-black-rim:oklch(45% .02 65);--stone-black-core:oklch(16% .01 60);--stone-white-rim:oklch(99% .005 90);--stone-white-core:oklch(86% .015 80);--accent:oklch(72% .12 72);--accent-soft:oklch(72% .12 72/.22);--cinnabar:oklch(55% .17 30);--serif:\"Songti SC\", \"STSong\", \"Noto Serif CJK SC\", Georgia, \"Times New Roman\", serif;height:100%;padding:16px;overflow-y:auto}.MXOHCW_inner{flex-direction:row;align-items:flex-start;gap:20px;max-width:1240px;margin:0 auto;display:flex}.MXOHCW_boardColumn{flex-direction:column;flex:1;align-items:center;gap:10px;min-width:0;display:flex}.MXOHCW_sidePanel{border:1px solid var(--border);background:var(--panel-bg);border-radius:12px;flex-direction:column;flex-shrink:0;gap:12px;width:300px;padding:14px;display:flex}.MXOHCW_panelTitle{font-family:var(--serif);align-items:center;gap:8px;font-size:14px;font-weight:600;display:flex}.MXOHCW_titleStone{border-radius:50%;flex:none;width:12px;height:12px}.MXOHCW_titleStoneBlack{background:radial-gradient(circle at 35% 30%, var(--stone-black-rim), var(--stone-black-core) 75%);box-shadow:0 1px 1px oklch(15% .02 50/.5)}.MXOHCW_titleStoneWhite{background:radial-gradient(circle at 35% 30%, var(--stone-white-rim), var(--stone-white-core) 75%);box-shadow:0 1px 1px oklch(30% .03 55/.4)}.MXOHCW_toolbar{flex-wrap:wrap;align-items:center;gap:8px;display:flex}.MXOHCW_label{color:var(--label-tertiary);font-size:12px}.MXOHCW_segmented{border:1px solid var(--border);background:var(--panel-bg);border-radius:999px;align-items:center;gap:2px;padding:2px;display:inline-flex}.MXOHCW_segButton{cursor:pointer;color:var(--label-secondary);background:0 0;border:none;border-radius:999px;padding:3px 12px;font-size:12px;transition:background-color .16s,color .16s}.MXOHCW_segButton:hover:not(:disabled){background:var(--interactive-hover);color:var(--label-primary)}.MXOHCW_segActive{background:var(--accent-soft);color:var(--label-primary);font-weight:600}.MXOHCW_select{border:1px solid var(--border);color:inherit;box-sizing:border-box;background:0 0;border-radius:8px;width:100%;padding:5px 8px;font-size:12px;transition:border-color .16s}.MXOHCW_select:disabled{opacity:.5}.MXOHCW_ghost{border:1px solid var(--border);color:var(--label-secondary);cursor:pointer;background:0 0;border-radius:999px;padding:4px 12px;font-size:12px;transition:background-color .16s,color .16s,border-color .16s}.MXOHCW_ghost:hover:not(:disabled){background:var(--interactive-hover);color:var(--label-primary)}.MXOHCW_primary{border:1px solid var(--accent);background:var(--accent-soft);color:var(--label-primary);cursor:pointer;border-radius:999px;padding:4px 14px;font-size:12px;font-weight:600;transition:background-color .16s,border-color .16s}.MXOHCW_primary:hover:not(:disabled){background:oklch(72% .12 72/.32)}.MXOHCW_action{border:1px solid var(--border);background:var(--panel-bg);height:30px;color:var(--label-primary);cursor:pointer;border-radius:999px;align-items:center;gap:6px;padding:0 12px;font-size:12px;font-weight:500;transition:background-color .16s,border-color .16s,box-shadow .16s;display:inline-flex}.MXOHCW_action:hover:not(:disabled){background:var(--interactive-hover);border-color:var(--dsw-alias-border-l3,#80808073)}.MXOHCW_action:active:not(:disabled){background:var(--interactive-active)}.MXOHCW_action:disabled{cursor:default;opacity:.45}.MXOHCW_actionPaused{border-color:var(--accent);background:var(--accent-soft)}.MXOHCW_actionPaused:hover:not(:disabled){background:oklch(72% .12 72/.32)}.MXOHCW_actionIcon{flex:none;width:15px;height:15px}.MXOHCW_statusRow{align-items:center;gap:8px;min-height:20px;display:flex}.MXOHCW_status{font-family:var(--serif);letter-spacing:.02em;font-size:15px;font-weight:600}.MXOHCW_statusError{color:var(--error)}.MXOHCW_statusDot{border-radius:50%;flex:none;width:10px;height:10px}.MXOHCW_dotBlack{background:radial-gradient(circle at 35% 30%, var(--stone-black-rim), var(--stone-black-core) 75%)}.MXOHCW_dotWhite{background:radial-gradient(circle at 35% 30%, var(--stone-white-rim), var(--stone-white-core) 75%);border:1px solid oklch(50% .03 60/.4)}.MXOHCW_dotAmber{background:var(--accent)}.MXOHCW_dotError{background:var(--error)}.MXOHCW_dotNeutral{background:var(--label-tertiary)}.MXOHCW_dotPulse{animation:1.6s ease-in-out infinite MXOHCW_dot-pulse}@keyframes MXOHCW_dot-pulse{0%,to{opacity:1}50%{opacity:.35}}.MXOHCW_retry{border:1px solid var(--error);background:color-mix(in oklab, var(--error) 12%, transparent);color:var(--error);cursor:pointer;border-radius:999px;padding:2px 12px;font-size:12px;transition:background-color .16s}.MXOHCW_retry:hover{background:color-mix(in oklab, var(--error) 24%, transparent)}.MXOHCW_hint{color:var(--label-tertiary);text-align:center;min-height:14px;font-size:11px}.MXOHCW_bottomBar{flex-wrap:wrap;justify-content:center;align-items:center;gap:10px;width:100%;margin-top:6px;display:flex}.MXOHCW_board{aspect-ratio:1;background-color:var(--wood-base);background-image:repeating-linear-gradient(90deg, oklch(66% .09 70/.14) 0 1px, transparent 1px 6px), radial-gradient(120% 60% at 50% 0%, oklch(86% .08 80/.35), transparent 60%), radial-gradient(130% 130% at 50% 50%, transparent 55%, oklch(45% .06 55/.3)), linear-gradient(90deg, transparent calc(50% - .5px), var(--grid-ink) calc(50% - .5px), var(--grid-ink) calc(50% + .5px), transparent calc(50% + .5px)), linear-gradient(to bottom, transparent calc(50% - .5px), var(--grid-ink) calc(50% - .5px), var(--grid-ink) calc(50% + .5px), transparent calc(50% + .5px));user-select:none;background-repeat:repeat,no-repeat,no-repeat,repeat-x,repeat-y;background-size:auto,auto,auto,6.66667% 100%,100% 6.66667%;border-radius:12px;grid-template-columns:repeat(15,1fr);width:100%;max-width:560px;display:grid;overflow:hidden;box-shadow:0 1px 2px oklch(20% .03 50/.4),0 10px 24px oklch(20% .03 50/.28)}.MXOHCW_cell{cursor:pointer;background:0 0;border:none;padding:0;position:relative}.MXOHCW_cell:disabled{cursor:default}.MXOHCW_cell:hover:not(:disabled){background:oklch(100% .02 85/.16)}.MXOHCW_cell:focus-visible{outline-offset:-2px;outline:2px solid oklch(25% .03 50/.8)}.MXOHCW_stone{pointer-events:none;border-radius:50%;animation:.18s cubic-bezier(.25,1,.4,1) MXOHCW_stone-pop;position:absolute;inset:8%}@keyframes MXOHCW_stone-pop{0%{opacity:.6;transform:scale(.85)}to{opacity:1;transform:scale(1)}}.MXOHCW_stoneBlack{background:radial-gradient(circle at 35% 30%, var(--stone-black-rim), var(--stone-black-core) 75%);box-shadow:0 1px 2px oklch(15% .02 50/.6),inset 0 1px 1px oklch(90% .02 80/.25)}.MXOHCW_stoneWhite{background:radial-gradient(circle at 35% 30%, var(--stone-white-rim), var(--stone-white-core) 75%);box-shadow:0 1px 2px oklch(30% .03 55/.45),inset 0 -1px 1px oklch(50% .03 60/.35)}.MXOHCW_preview{opacity:0;transition:opacity .16s;animation:none}.MXOHCW_cell:hover:not(:disabled) .MXOHCW_preview,.MXOHCW_cell:focus-visible .MXOHCW_preview{opacity:.45}.MXOHCW_lastMove:after{content:\"\";background:var(--cinnabar);border-radius:50%;width:22%;height:22%;position:absolute;top:10%;right:10%;box-shadow:0 0 0 1px oklch(30% .05 30/.35)}.MXOHCW_hoshi{background:var(--hoshi-ink);pointer-events:none;border-radius:50%;width:24%;height:24%;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)}.MXOHCW_field{flex-direction:column;flex:1;gap:4px;min-width:0;display:flex}.MXOHCW_promptArea{border:1px solid var(--border);background:var(--well-bg);border-radius:10px;flex-direction:column;gap:8px;padding:10px;display:flex}.MXOHCW_promptTitle{color:var(--label-secondary);font-size:12px;font-weight:600}.MXOHCW_promptTextarea{box-sizing:border-box;border:1px solid var(--border);background:var(--well-bg);width:100%;color:inherit;resize:vertical;border-radius:8px;padding:8px;font-family:inherit;font-size:12px;line-height:1.5;transition:border-color .16s}.MXOHCW_promptActions{align-items:center;gap:8px;display:flex}.MXOHCW_flash{color:var(--success);font-size:12px}.MXOHCW_reasoningList{border:1px solid var(--border);background:var(--well-bg);border-radius:10px;flex-direction:column;max-height:320px;padding:6px 10px;display:flex;overflow-y:auto}.MXOHCW_reasoningTitle{color:var(--label-secondary);padding:4px 0 6px;font-size:12px;font-weight:600}.MXOHCW_reasoningItem+.MXOHCW_reasoningItem{border-top:1px solid var(--border-soft)}.MXOHCW_reasoningHeader{box-sizing:border-box;width:100%;color:inherit;text-align:left;cursor:pointer;background:0 0;border:none;border-radius:6px;align-items:baseline;gap:8px;padding:5px 2px;font-size:12px;font-weight:600;transition:background-color .15s;display:flex}.MXOHCW_reasoningHeader:hover{background:var(--interactive-hover)}.MXOHCW_chevron{font-size:10px;transition:transform .15s;display:inline-block}.MXOHCW_chevronOpen{transform:rotate(90deg)}.MXOHCW_reasoningCoord{opacity:.7;margin-left:6px;font-weight:400}.MXOHCW_errorText{color:var(--error);font-weight:400}.MXOHCW_reasoningText{white-space:pre-wrap;word-break:break-word;color:var(--label-secondary);background:var(--well-bg);border-radius:6px;margin:6px 0 2px;padding:8px;font-family:inherit;font-size:11px;line-height:1.5}.MXOHCW_action:focus-visible,.MXOHCW_ghost:focus-visible,.MXOHCW_primary:focus-visible,.MXOHCW_retry:focus-visible,.MXOHCW_segButton:focus-visible,.MXOHCW_reasoningHeader:focus-visible,.MXOHCW_select:focus-visible,.MXOHCW_promptTextarea:focus-visible{outline:2px solid var(--accent);outline-offset:2px}@media (prefers-reduced-motion:reduce){.MXOHCW_stone,.MXOHCW_dotPulse{animation:none}.MXOHCW_segButton,.MXOHCW_action,.MXOHCW_ghost,.MXOHCW_primary,.MXOHCW_retry,.MXOHCW_preview,.MXOHCW_chevron,.MXOHCW_select,.MXOHCW_promptTextarea{transition:none}}html.MXOHCW_viewActive [data-composer-seat]{display:none}";
		const tagId = "@yejiming/dsh-gomoku/Gomoku.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@yejiming/dsh-gomoku";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var Gomoku_module_css_default = {
			"status": "MXOHCW_status",
			"actionIcon": "MXOHCW_actionIcon",
			"hoshi": "MXOHCW_hoshi",
			"chevronOpen": "MXOHCW_chevronOpen",
			"promptTextarea": "MXOHCW_promptTextarea",
			"toolbar": "MXOHCW_toolbar",
			"promptActions": "MXOHCW_promptActions",
			"action": "MXOHCW_action",
			"titleStoneWhite": "MXOHCW_titleStoneWhite",
			"segButton": "MXOHCW_segButton",
			"dot-pulse": "MXOHCW_dot-pulse",
			"primary": "MXOHCW_primary",
			"hint": "MXOHCW_hint",
			"stone": "MXOHCW_stone",
			"reasoningHeader": "MXOHCW_reasoningHeader",
			"ghost": "MXOHCW_ghost",
			"dotNeutral": "MXOHCW_dotNeutral",
			"promptArea": "MXOHCW_promptArea",
			"bottomBar": "MXOHCW_bottomBar",
			"dotBlack": "MXOHCW_dotBlack",
			"chevron": "MXOHCW_chevron",
			"retry": "MXOHCW_retry",
			"lastMove": "MXOHCW_lastMove",
			"actionPaused": "MXOHCW_actionPaused",
			"boardColumn": "MXOHCW_boardColumn",
			"reasoningItem": "MXOHCW_reasoningItem",
			"sidePanel": "MXOHCW_sidePanel",
			"board": "MXOHCW_board",
			"reasoningList": "MXOHCW_reasoningList",
			"reasoningText": "MXOHCW_reasoningText",
			"stone-pop": "MXOHCW_stone-pop",
			"panelTitle": "MXOHCW_panelTitle",
			"view": "MXOHCW_view",
			"inner": "MXOHCW_inner",
			"cell": "MXOHCW_cell",
			"errorText": "MXOHCW_errorText",
			"titleStoneBlack": "MXOHCW_titleStoneBlack",
			"stoneBlack": "MXOHCW_stoneBlack",
			"promptTitle": "MXOHCW_promptTitle",
			"preview": "MXOHCW_preview",
			"segmented": "MXOHCW_segmented",
			"select": "MXOHCW_select",
			"dotError": "MXOHCW_dotError",
			"label": "MXOHCW_label",
			"dotAmber": "MXOHCW_dotAmber",
			"statusRow": "MXOHCW_statusRow",
			"viewActive": "MXOHCW_viewActive",
			"titleStone": "MXOHCW_titleStone",
			"statusDot": "MXOHCW_statusDot",
			"dotPulse": "MXOHCW_dotPulse",
			"reasoningTitle": "MXOHCW_reasoningTitle",
			"flash": "MXOHCW_flash",
			"statusError": "MXOHCW_statusError",
			"stoneWhite": "MXOHCW_stoneWhite",
			"field": "MXOHCW_field",
			"reasoningCoord": "MXOHCW_reasoningCoord",
			"segActive": "MXOHCW_segActive",
			"dotWhite": "MXOHCW_dotWhite"
		};
		//#endregion
		//#region src/client/GomokuView.tsx
		/**
		* The gomoku conversation view: the board tab content. Three columns —
		* black's AI panel (model, thinking level, always-editable prompt, black
		* reasoning log) on the left, the board with the mode / new-game controls
		* below it in the middle, and white's AI panel on the right. Rendered inside
		* the conversation view ring (the same slot Trajectory occupies),
		* one-at-a-time by the session body — so the component unmounts on tab
		* switches and the game state lives in the module-level store (see store.ts),
		* never here.
		*
		* While this view is active the composer seat is hidden: the view marks the
		* document root with a class on mount and the stylesheet hides the
		* platform's composer seat (`[data-composer-seat]`) under it.
		*/
		const MODES = [
			{
				value: "black",
				key: "mode.black"
			},
			{
				value: "white",
				key: "mode.white"
			},
			{
				value: "both",
				key: "mode.both"
			}
		];
		const THINKINGS = [
			{
				value: "off",
				key: "thinking.off"
			},
			{
				value: "high",
				key: "thinking.high"
			},
			{
				value: "max",
				key: "thinking.max"
			}
		];
		/**
		* The five star points of a 15×15 board (row-major indices): the four corner
		* hoshi plus tengen. Drawn while the intersection is still empty.
		*/
		const HOSHI = new Set([
			48,
			56,
			168,
			176,
			TENGEN.row * 15 + TENGEN.col
		]);
		/** The status line copy for the current game. */
		function statusCopy(game, t) {
			if (game.winner === 1) return {
				text: t("status.win.black"),
				error: false
			};
			if (game.winner === 2) return {
				text: t("status.win.white"),
				error: false
			};
			if (game.draw) return {
				text: t("status.draw"),
				error: false
			};
			if (game.paused) return {
				text: t("status.paused"),
				error: false
			};
			if (game.thinking) return {
				text: t("status.thinking"),
				error: false
			};
			const last = game.log[game.log.length - 1];
			if (last?.interrupted === true) return {
				text: t("status.interrupted"),
				error: true
			};
			if (last?.error !== void 0) return {
				text: t("status.error", { message: last.error }),
				error: true
			};
			return {
				text: game.turn === 1 ? t("status.turn.black") : t("status.turn.white"),
				error: false
			};
		}
		/** One intersection: clickable when it is the human's turn. */
		function CellButton({ row, col, cell, last, playable, preview, onClick }) {
			const index = row * 15 + col;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: Gomoku_module_css_default.cell,
				disabled: !playable,
				"aria-label": `${row},${col}`,
				title: `${row},${col}`,
				onClick: () => onClick(row, col),
				children: [
					cell !== 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: `${Gomoku_module_css_default.stone} ${cell === 1 ? Gomoku_module_css_default.stoneBlack : Gomoku_module_css_default.stoneWhite}${last ? ` ${Gomoku_module_css_default.lastMove}` : ""}` }),
					cell === 0 && playable && preview !== 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: `${Gomoku_module_css_default.stone} ${preview === 1 ? Gomoku_module_css_default.stoneBlack : Gomoku_module_css_default.stoneWhite} ${Gomoku_module_css_default.preview}` }),
					cell === 0 && HOSHI.has(index) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: Gomoku_module_css_default.hoshi })
				]
			});
		}
		/** One per-side model selector. */
		function ModelSelect({ label, value, groups, onChange }) {
			const selected = value.provider !== void 0 && value.model !== void 0 ? `${value.provider}/${value.model}` : "";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: Gomoku_module_css_default.field,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: Gomoku_module_css_default.label,
					children: label
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
					className: Gomoku_module_css_default.select,
					value: selected,
					onChange: (event) => {
						const [provider, ...rest] = event.target.value.split("/");
						onChange({
							provider,
							model: rest.join("/")
						});
					},
					disabled: groups.length === 0,
					children: [groups.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
						value: "",
						children: "—"
					}), groups.map((group) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("optgroup", {
						label: group.displayName,
						children: group.models.map((model) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: `${group.provider}/${model.id}`,
							children: model.name
						}, model.id))
					}, group.provider))]
				})]
			});
		}
		/**
		* One side's always-visible system-prompt editor. Starts from the stored
		* value (or the node half's default once loaded, when nothing is stored),
		* and saves back through the store — undefined restores the default prompt.
		*/
		function PromptEditor({ label, value, onSave, t }) {
			const [text, setText] = (0, react.useState)(value ?? "");
			const [defaultPrompt, setDefaultPrompt] = (0, react.useState)(void 0);
			const [loading, setLoading] = (0, react.useState)(false);
			const [saved, setSaved] = (0, react.useState)(false);
			const savedTimer = (0, react.useRef)(void 0);
			(0, react.useEffect)(() => {
				let cancelled = false;
				setLoading(true);
				fetch("/plugins/gomoku/prompt").then((response) => response.json()).then((body) => {
					if (cancelled || body.prompt === void 0) return;
					setDefaultPrompt(body.prompt);
					if (value === void 0 && text === "") setText(body.prompt);
				}).catch(() => {}).finally(() => {
					if (!cancelled) setLoading(false);
				});
				return () => {
					cancelled = true;
				};
			}, []);
			(0, react.useEffect)(() => () => {
				window.clearTimeout(savedTimer.current);
			}, []);
			const flashSaved = () => {
				setSaved(true);
				window.clearTimeout(savedTimer.current);
				savedTimer.current = window.setTimeout(() => setSaved(false), 1500);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Gomoku_module_css_default.promptArea,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Gomoku_module_css_default.promptTitle,
						children: label
					}),
					loading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Gomoku_module_css_default.hint,
						children: t("panel.prompt.loading")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
						className: Gomoku_module_css_default.promptTextarea,
						value: text,
						rows: 7,
						spellCheck: false,
						onChange: (event) => setText(event.target.value)
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Gomoku_module_css_default.promptActions,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: Gomoku_module_css_default.ghost,
								onClick: () => {
									setText(defaultPrompt ?? "");
									onSave(void 0);
								},
								children: t("panel.prompt.restore")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: Gomoku_module_css_default.primary,
								onClick: () => {
									onSave(text.trim().length > 0 ? text : void 0);
									flashSaved();
								},
								children: t("panel.prompt.save")
							}),
							saved && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: Gomoku_module_css_default.flash,
								children: t("panel.prompt.saved")
							})
						]
					})
				]
			});
		}
		/**
		* One side's AI panel: the model selector, the side's thinking level, the
		* side's always-editable system prompt, and that side's reasoning log
		* (entries default collapsed; click to expand).
		*/
		function SidePanel({ title, stone, modelLabel, promptLabel, logTitle, model, thinking, prompt, groups, log, expanded, t, onModelChange, onThinkingChange, onPromptSave, onToggleEntry }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Gomoku_module_css_default.sidePanel,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Gomoku_module_css_default.panelTitle,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: `${Gomoku_module_css_default.titleStone} ${stone === "black" ? Gomoku_module_css_default.titleStoneBlack : Gomoku_module_css_default.titleStoneWhite}` }), title]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelSelect, {
						label: modelLabel,
						value: model,
						groups,
						onChange: onModelChange
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Gomoku_module_css_default.toolbar,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: Gomoku_module_css_default.label,
							children: t("panel.thinking")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: Gomoku_module_css_default.segmented,
							role: "group",
							"aria-label": t("panel.thinking"),
							children: THINKINGS.map((level) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: `${Gomoku_module_css_default.segButton}${thinking === level.value ? ` ${Gomoku_module_css_default.segActive}` : ""}`,
								onClick: () => onThinkingChange(level.value),
								children: t(level.key)
							}, level.value))
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PromptEditor, {
						label: promptLabel,
						value: prompt,
						onSave: onPromptSave,
						t
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Gomoku_module_css_default.reasoningList,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: Gomoku_module_css_default.reasoningTitle,
								children: logTitle
							}),
							log.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: Gomoku_module_css_default.hint,
								children: t("reasoning.empty")
							}),
							log.map((entry) => {
								const isExpanded = expanded.has(entry.n);
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: Gomoku_module_css_default.reasoningItem,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: Gomoku_module_css_default.reasoningHeader,
										"aria-expanded": isExpanded,
										"aria-label": isExpanded ? t("reasoning.collapse") : t("reasoning.expand"),
										onClick: () => onToggleEntry(entry.n),
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: `${Gomoku_module_css_default.chevron}${isExpanded ? ` ${Gomoku_module_css_default.chevronOpen}` : ""}`,
												children: "▸"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: Gomoku_module_css_default.reasoningMove,
												children: [t("reasoning.move", { n: entry.n }), entry.move !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: Gomoku_module_css_default.reasoningCoord,
													children: entry.move
												})]
											}),
											entry.interrupted === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: Gomoku_module_css_default.errorText,
												children: t("status.interrupted")
											}),
											entry.error !== void 0 && entry.interrupted !== true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: Gomoku_module_css_default.errorText,
												children: entry.error
											})
										]
									}), isExpanded && entry.reasoning !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
										className: Gomoku_module_css_default.reasoningText,
										children: entry.reasoning
									})]
								}, entry.n);
							})
						]
					})
				]
			});
		}
		/** The gomoku view tab body. */
		function GomokuView({ t }) {
			const { game, settings } = (0, react.useSyncExternalStore)(subscribe, getSnapshot);
			const [expandedEntries, setExpandedEntries] = (0, react.useState)(/* @__PURE__ */ new Set());
			(0, react.useEffect)(() => {
				loadModels();
			}, []);
			(0, react.useEffect)(() => {
				document.documentElement.classList.add(Gomoku_module_css_default.viewActive);
				return () => {
					document.documentElement.classList.remove(Gomoku_module_css_default.viewActive);
				};
			}, []);
			const status = statusCopy(game, t);
			const settled = game.winner !== 0 || game.draw;
			const humanTurn = settings.mode === "black" && game.turn === 1 || settings.mode === "white" && game.turn === 2;
			const opening = game.moveCount === 0;
			const retryableError = status.error && !settled && !game.thinking && !game.paused;
			const statusDot = settled ? game.winner === 1 ? Gomoku_module_css_default.dotBlack : game.winner === 2 ? Gomoku_module_css_default.dotWhite : Gomoku_module_css_default.dotNeutral : status.error ? Gomoku_module_css_default.dotError : game.paused || game.thinking ? `${Gomoku_module_css_default.dotAmber} ${Gomoku_module_css_default.dotPulse}` : game.turn === 1 ? Gomoku_module_css_default.dotBlack : Gomoku_module_css_default.dotWhite;
			const toggleEntry = (n) => {
				setExpandedEntries((prev) => {
					const next = new Set(prev);
					if (next.has(n)) next.delete(n);
					else next.add(n);
					return next;
				});
			};
			const blackLog = game.log.filter((entry) => entry.side === "black");
			const whiteLog = game.log.filter((entry) => entry.side === "white");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: Gomoku_module_css_default.view,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: Gomoku_module_css_default.inner,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SidePanel, {
							title: t("panel.black"),
							stone: "black",
							modelLabel: t("panel.model.black"),
							promptLabel: t("panel.prompt.black"),
							logTitle: t("panel.log.black"),
							model: settings.blackModel,
							thinking: settings.blackThinking,
							prompt: settings.blackPrompt,
							groups: settings.groups,
							log: blackLog,
							expanded: expandedEntries,
							t,
							onModelChange: (blackModel) => patchSettings({ blackModel }),
							onThinkingChange: (blackThinking) => patchSettings({ blackThinking }),
							onPromptSave: (blackPrompt) => patchSettings({ blackPrompt }),
							onToggleEntry: toggleEntry
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: Gomoku_module_css_default.boardColumn,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: Gomoku_module_css_default.statusRow,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: `${Gomoku_module_css_default.statusDot} ${statusDot}`,
											"aria-hidden": "true"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: `${Gomoku_module_css_default.status}${status.error ? ` ${Gomoku_module_css_default.statusError}` : ""}`,
											children: status.text
										}),
										retryableError && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: Gomoku_module_css_default.retry,
											onClick: retryMove,
											children: t("status.retry")
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: Gomoku_module_css_default.hint,
									children: [
										game.paused && t("status.paused.hint"),
										!game.paused && settings.mode === "black" && t("status.side.hint"),
										!game.paused && settings.mode === "white" && t("status.side.hint.white"),
										!game.paused && settings.mode === "both" && t("status.side.hint.both"),
										opening && ` · ${t("rule.first.tengen")}`
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: Gomoku_module_css_default.board,
									role: "grid",
									"aria-label": t("tab.label"),
									children: game.board.map((cell, index) => {
										const row = Math.floor(index / 15);
										const col = index % 15;
										const last = game.lastMove !== null && game.lastMove.row === row && game.lastMove.col === col;
										const playable = !settled && !game.thinking && (game.paused || humanTurn);
										return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CellButton, {
											row,
											col,
											cell,
											last,
											playable,
											preview: playable ? game.turn : 0,
											onClick: placeStone
										}, index);
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: Gomoku_module_css_default.bottomBar,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: Gomoku_module_css_default.label,
											children: t("panel.mode")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: Gomoku_module_css_default.segmented,
											role: "group",
											"aria-label": t("panel.mode"),
											children: MODES.map((mode) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: `${Gomoku_module_css_default.segButton}${settings.mode === mode.value ? ` ${Gomoku_module_css_default.segActive}` : ""}`,
												onClick: () => changeMode(mode.value),
												children: t(mode.key)
											}, mode.value))
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: Gomoku_module_css_default.action,
											onClick: () => newGame(),
											"aria-label": t("panel.newGame"),
											title: t("panel.newGame"),
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
												className: Gomoku_module_css_default.actionIcon,
												viewBox: "0 0 16 16",
												"aria-hidden": "true",
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
													d: "M13.5 8a5.5 5.5 0 1 1-1.6-3.9",
													fill: "none",
													stroke: "currentColor",
													strokeWidth: "1.5",
													strokeLinecap: "round"
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
													d: "M13.7 1.9v3.2h-3.2",
													fill: "none",
													stroke: "currentColor",
													strokeWidth: "1.5",
													strokeLinecap: "round",
													strokeLinejoin: "round"
												})]
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("panel.newGame") })]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: `${Gomoku_module_css_default.action}${game.paused ? ` ${Gomoku_module_css_default.actionPaused}` : ""}`,
											disabled: settled,
											onClick: togglePause,
											"aria-label": game.paused ? t("panel.resume") : t("panel.pause"),
											title: game.paused ? t("panel.resume") : t("panel.pause"),
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
												className: Gomoku_module_css_default.actionIcon,
												viewBox: "0 0 16 16",
												"aria-hidden": "true",
												children: game.paused ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
													d: "M5.2 3.4l7 4.6-7 4.6z",
													fill: "currentColor"
												}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
													d: "M5.5 3.5v9M10.5 3.5v9",
													stroke: "currentColor",
													strokeWidth: "1.8",
													strokeLinecap: "round"
												})
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: game.paused ? t("panel.resume") : t("panel.pause") })]
										})
									]
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SidePanel, {
							title: t("panel.white"),
							stone: "white",
							modelLabel: t("panel.model.white"),
							promptLabel: t("panel.prompt.white"),
							logTitle: t("panel.log.white"),
							model: settings.whiteModel,
							thinking: settings.whiteThinking,
							prompt: settings.whitePrompt,
							groups: settings.groups,
							log: whiteLog,
							expanded: expandedEntries,
							t,
							onModelChange: (whiteModel) => patchSettings({ whiteModel }),
							onThinkingChange: (whiteThinking) => patchSettings({ whiteThinking }),
							onPromptSave: (whitePrompt) => patchSettings({ whitePrompt }),
							onToggleEntry: toggleEntry
						})
					]
				})
			});
		}
		//#endregion
		//#region src/client/locales.ts
		/** `gomoku` namespace dictionaries for the board tab. */
		/** Dictionary namespace owned by this plugin. */
		const NS = "gomoku";
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"tab.label": "五子棋",
			"panel.mode": "对弈模式",
			"mode.black": "执黑先手",
			"mode.white": "执白后发",
			"mode.both": "双 AI 对弈",
			"panel.black": "黑方 AI",
			"panel.white": "白方 AI",
			"panel.thinking": "思考档位",
			"thinking.off": "Off",
			"thinking.high": "High",
			"thinking.max": "Max",
			"panel.model.black": "黑方模型",
			"panel.model.white": "白方模型",
			"panel.newGame": "新开局",
			"panel.pause": "暂停",
			"panel.resume": "继续",
			"panel.log.black": "黑方思考记录",
			"panel.log.white": "白方思考记录",
			"panel.prompt.black": "黑方提示词",
			"panel.prompt.white": "白方提示词",
			"panel.prompt.save": "保存",
			"panel.prompt.restore": "恢复默认",
			"panel.prompt.loading": "正在加载默认提示词…",
			"panel.prompt.saved": "已保存",
			"reasoning.empty": "暂无思考记录",
			"reasoning.move": "第 {n} 手",
			"reasoning.expand": "展开详情",
			"reasoning.collapse": "收起",
			"status.retry": "重试",
			"status.interrupted": "AI 思考已中断",
			"status.turn.black": "黑方落子",
			"status.turn.white": "白方落子",
			"status.thinking": "AI 思考中…",
			"status.paused": "已暂停 · 手动对弈中",
			"status.paused.hint": "暂停中：可为黑白双方轮流落子，AI 思考已中断",
			"status.win.black": "黑方胜！",
			"status.win.white": "白方胜！",
			"status.draw": "和棋",
			"status.error": "出错了：{message}",
			"status.side.hint": "你执黑方 · 黑先手",
			"status.side.hint.white": "你执白方 · AI 执黑先手",
			"status.side.hint.both": "双 AI 对弈，旁观中",
			"rule.first.tengen": "黑方第一手必须落在天元 (7,7)"
		};
		/** English dictionary, checked complete against the zh key set. */
		const en = {
			"tab.label": "Gomoku",
			"panel.mode": "Mode",
			"mode.black": "Play Black",
			"mode.white": "Play White",
			"mode.both": "AI vs AI",
			"panel.black": "Black AI",
			"panel.white": "White AI",
			"panel.thinking": "Thinking",
			"thinking.off": "Off",
			"thinking.high": "High",
			"thinking.max": "Max",
			"panel.model.black": "Black model",
			"panel.model.white": "White model",
			"panel.newGame": "New game",
			"panel.pause": "Pause",
			"panel.resume": "Resume",
			"panel.log.black": "Black's reasoning log",
			"panel.log.white": "White's reasoning log",
			"panel.prompt.black": "Black's prompt",
			"panel.prompt.white": "White's prompt",
			"panel.prompt.save": "Save",
			"panel.prompt.restore": "Restore default",
			"panel.prompt.loading": "Loading default prompt…",
			"panel.prompt.saved": "Saved",
			"reasoning.empty": "No reasoning recorded yet",
			"reasoning.move": "Move {n}",
			"reasoning.expand": "Expand",
			"reasoning.collapse": "Collapse",
			"status.retry": "Retry",
			"status.interrupted": "AI thinking interrupted",
			"status.turn.black": "Black's turn",
			"status.turn.white": "White's turn",
			"status.thinking": "AI is thinking…",
			"status.paused": "Paused — manual play",
			"status.paused.hint": "Paused: play both black and white; AI thinking is interrupted",
			"status.win.black": "Black wins!",
			"status.win.white": "White wins!",
			"status.draw": "Draw",
			"status.error": "Error: {message}",
			"status.side.hint": "You play black · black moves first",
			"status.side.hint.white": "You play white · AI opens as black",
			"status.side.hint.both": "AI vs AI — spectating",
			"rule.first.tengen": "Black's opening move must be the tengen (7,7)"
		};
		//#endregion
		//#region src/client/index.ts
		/** Required services: the locale service and the slot registry. */
		const inject = ["locale", "slots"];
		/**
		* Client plugin body: register the gomoku dictionaries and the
		* conversation-view tab. The registration rides the slot service's effect
		* wrapper, so plugin unload removes the tab.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "gomoku: dictionaries");
			const t = ctx.locale.bind(NS);
			ctx.slots.inject("conversation.view", () => ctx.slots.register({
				name: "conversation.view",
				id: "gomoku",
				order: 20,
				label: () => t("tab.label"),
				locale: NS
			}, GomokuView));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map