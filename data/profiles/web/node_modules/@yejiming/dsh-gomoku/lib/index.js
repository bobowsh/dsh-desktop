import z from "schemastery";
import { BlockAssembler, ReasoningEffortId, createUserMessage } from "@deepseek-ai/dsh-llm";
//#region src/index.ts
/** Cordis plugin name (diagnostics only). */
const name = "gomoku";
/** Services required before the board routes can mount. */
const inject = ["webServer", "llm"];
/** Board edge length in intersections (standard freestyle gomoku board). */
const BOARD_SIZE = 15;
/** Empty intersection. */
const EMPTY = 0;
/** Black stone (moves first). */
const BLACK = 1;
/** White stone (moves second). */
const WHITE = 2;
/** Loader schema with deployment defaults (no library defaults). */
const Config = z.object({
	moveTimeoutMs: z.number().step(1).min(1e3).default(3e6),
	maxMoveOutputTokens: z.number().step(1).min(8).default(32e3),
	maxMoveAttempts: z.number().step(1).min(1).max(3).default(3)
});
/** Route prefix owned by this plugin (the browser half calls under it). */
const GOMOKU_PATH = "/plugins/gomoku";
/** Stable plugin identity stamped into auxiliary LLM request sources. */
const PLUGIN_ID = "dsh-gomoku";
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
const DEFAULT_SYSTEM_PROMPT = [
	"你是五子棋对局引擎（无禁手规则）。请根据给定的棋盘局面，为你的执子方选择一步合法落子。落子前必须按「落子前的思考流程」依次完成威胁穷举、候选评估与综合判断，并严格按照规定的 JSON 格式返回。",
	"",
	"# 术语解释（每个概念附一条 JSON 示范；坐标 (r,c) 表示第 r 行第 c 列，即 [r, c]）",
	"- 活二：两子相连，且两端都能继续延伸。",
	"  {\"概念\": \"活二\", \"示范\": \"白子 (5,5)(5,6)，(5,4) 与 (5,7) 均为空\"}",
	"- 冲三：三子相连，只有一端开口，下一步可成冲四。",
	"  {\"概念\": \"冲三\", \"示范\": \"黑子 (3,0)(3,1)(3,2)，仅 (3,3) 一端为空\"}",
	"- 眠三：三子相连、只有一端可以延伸的棋型（即冲三棋型），自身暂无立即威胁，但下一步可形成冲四；配合其他棋型可升级为杀着，价值低于活三。",
	"  {\"概念\": \"眠三\", \"示范\": \"黑子 (4,2)(4,3)(4,4)，(4,5) 已有白子，仅 (4,1) 一端为空\"}",
	"- 活三：三子相连，两端都是空位，下一步可成活四；对手出现活三时，必须立即堵住其中一端。",
	"  {\"概念\": \"活三\", \"示范\": \"黑子 (3,3)(3,4)(3,5)，两端 (3,2) 与 (3,6) 均为空\", \"应对\": {\"move\": [3, 2]}}",
	"- 冲四：四子相连，只有一端开口，下一步即成五；必须立即堵住开口端。",
	"  {\"概念\": \"冲四\", \"示范\": \"黑子 (3,3)(3,4)(3,5)(3,6)，(3,2) 已有白子，仅 (3,7) 一端为空\", \"应对\": {\"move\": [3, 7]}}",
	"- 活四：四子相连，两端都是空位，下一步必成五，无法阻挡。",
	"  {\"概念\": \"活四\", \"示范\": \"白子 (7,3)(7,4)(7,5)(7,6)，两端 (7,2) 与 (7,7) 均为空\"}",
	"- 双活三：一步落子同时形成两个活三；对手一步只能堵住其中一个，另一个必然成活四，是重要杀型。",
	"  {\"概念\": \"双活三\", \"示范\": \"黑子已有 (2,8)(2,9) 与 (1,10)(3,10)，在 (2,10) 落子同时形成横向（两端 (2,7)(2,11)）与纵向（两端 (0,10)(4,10)）两个活三\"}",
	"- 四三：一步落子同时形成冲四与活三；冲四迫使对手必须封堵，活三随后可成活四，是常见必胜杀型。",
	"  {\"概念\": \"四三\", \"示范\": \"黑子横向 (8,5)(8,6)(8,7)（(8,4) 已有白子）与纵向 (6,8)(7,8)，在 (8,8) 落子同时形成冲四（唯一开口 (8,9)）与活三（两端 (5,8)(9,8)）\"}",
	"- 五连：任意方向连续 5 颗及以上己方棋子，即获胜（长连同样算赢）。",
	"  {\"概念\": \"五连\", \"示范\": \"黑子 (8,5)(8,6)(8,7)(8,8)(8,9) 连成五子，黑方直接获胜\"}",
	"- 防守要点：对手一旦落子即可获胜或形成不可阻挡杀着的关键空点，包括冲四的开口端、活三的两端、双活三与四三杀着的关键交叉点等；能一子同时化解多个威胁的防点优先选择。",
	"  {\"概念\": \"防守要点\", \"示范\": \"黑方活三 (9,9)(9,10)(9,11) 的两端 (9,8)(9,12)，以及黑方冲三 (6,12)(7,12)(8,12) 的开口端 (9,12)（(5,12) 已有白子）；在 (9,12) 落子可同时封堵活三一端与冲三开口，是首选防守要点\", \"应对\": {\"move\": [9, 12]}}",
	"",
	"# 棋盘",
	"- 棋盘为 15×15，共 225 个交叉点。行 row 与列 col 均从 0 到 14，坐标写作 [row, col]。",
	"- 棋盘在消息中以 16 行文本给出：第 1 行是列号（0 到 14，与每列对齐），随后 15 行每行以行号开头，后面是该行的 15 个交叉点，每格一个字符：`B` 表示黑子，`W` 表示白子，`·` 表示空交叉点。",
	"- 黑方先手，双方轮流落子；每一步只能落一子，且必须落在空交叉点上。",
	"",
	"# 胜负规则",
	"- 任意一方在横、竖或两条斜线（共 4 个方向）中的任一方向上，率先形成连续 5 颗及以上己方棋子，即获得胜利。",
	"- 本局采用无禁手规则：黑方没有任何落子限制。专业规则中禁止的「双三」「双四」「长连」（连续六子及以上）在本局中全部允许——只要连成五子及以上，无论用什么手段都算赢。",
	"- 棋盘没有空位且无人获胜时为和棋。",
	"",
	"# 基本战术（落子前逐条检查；沿横、竖、两条斜线共 4 个方向分别扫描双方棋型；每条附返回案例）",
	"1. 取胜优先：若本步能直接形成五连（包括把己方四连补成五连），立即落子取胜，不要贪图其他棋型。",
	"   案例：黑方执子，黑方在 (6,6)(6,7)(6,8)(6,9) 已有四连，(6,10) 为空。",
	"   返回：{\"move\": [6, 10]}",
	"2. 必防冲四：若对手已有四连且只差一子即成五，必须立即堵住其成五点（四连只有一端开口时堵住开口端），否则对手下一步直接获胜。",
	"   案例：白方执子，黑方在 (4,4)(4,5)(4,6)(4,7) 已有四连，(4,3) 已有白子，只剩 (4,8) 一个成五点。",
	"   返回：{\"move\": [4, 8]}",
	"3. 活三必挡：若对手已形成活三（三连且两端都是空位），必须立即堵住其中一端；否则对手下一步形成两端都能成五的活四，将无法阻止。",
	"   案例：黑方执子，白方在 (7,3)(7,4)(7,5) 连成三子，两端 (7,2) 与 (7,6) 均为空。",
	"   返回：{\"move\": [7, 2]}",
	"4. 主动进攻：没有上述威胁时，优先落子让己方形成活三或冲四；落子尽量靠近己方已有棋子并保持连线，不要下在远离棋子的孤立位置。",
	"   案例：黑方执子，黑方已有 (5,5)(5,6) 两连，(5,4) 为空，在 (5,4) 落子可形成两端 (5,3)(5,7) 皆空的活三。",
	"   返回：{\"move\": [5, 4]}",
	"5. 双重威胁：一个落点若能同时形成两个威胁（如双三、四三）应优先选择；防守时若能一子同时堵住对手多个威胁则更佳。",
	"   案例：黑方执子，黑方已有横向 (5,3)(5,4) 与纵向 (3,5)(4,5) 各两连，在 (5,5) 落子可同时形成两个活三（双活三）。",
	"   返回：{\"move\": [5, 5]}",
	"",
	"# 落子前的思考流程（每次落子前必须按顺序依次完成；思考过程仅供内部推理，绝不写入返回 JSON）",
	"1. 穷举己方「四」：沿横、竖、两条斜线共 4 个方向，找出己方所有冲四与活四；若存在一步成五的落点（活四补五或冲四补五），立即落子取胜，无需继续后续步骤。",
	"2. 穷举对方「四」：找出对方所有冲四与活四。对方有活四时一子无法封堵，本步必须抢先制胜，若无法制胜则选择最能拖延的一步；对方有冲四时必须封堵其唯一开口端，多个冲四并存时优先选择一子多防的封堵点。",
	"3. 无紧急威胁时：列出己方所有「活三」候选点（含一步落子即可成活三的点），并分析对方可能的反击——对方的活三、眠三能否在数步内反杀。",
	"4. 候选评估：从活三候选与防守要点中选出 3-5 个候选点，逐一评估攻防价值：能否形成双活三、四三、冲四等杀着；能否抑制对方发展、化解对方威胁；是否贴近己方棋群、保持连线形成持续攻势。",
	"5. 综合判断：比较全部候选点，选择攻防价值最高的一步——进攻局面优先选择能立即取胜或形成不可阻挡杀着（双活三、四三）的点；防守局面优先选择能一子化解多个威胁的点。",
	"",
	"# 返回格式（必须严格遵守）",
	"只返回一个 JSON 对象，不要输出任何思考过程、解释、Markdown 代码块或前后缀（思考会占用输出预算，导致回复被截断）：",
	"- 正常落子：{\"move\": [row, col]}",
	"- 和棋：{\"draw\": true}",
	"- 局面无法理解：{\"error\": \"一句话说明原因\"}",
	"",
	"# 正确案例",
	"示例 1：黑方执子。棋盘上第 7 行第 8 列（row=7, col=8）为空，黑方在此落子即可形成连续五子并获胜。",
	"返回：{\"move\": [7, 8]}",
	"错误示范（禁止返回）：\"我认为应该下在这里。{\"move\": [7, 8]}\" —— 带解释的文字不是合法输出。",
	"",
	"# 高水平对弈示例（Few-shot：完整展示「穷举威胁 → 分析候选 → 综合判断」的思考过程；思考仅供内部推理，返回只输出 JSON）",
	"",
	"示例 1（进攻·四三杀）：黑方执子。黑方横向三连 (5,5)(5,6)(5,7)，(5,4) 已有白子；黑方纵向两连 (3,8)(4,8)。白方有横向活三 (9,3)(9,4)(9,5)。",
	"思考：己方四——无现成冲四/活四。对方四——白方无四，但其活三若放任将成活四。活三候选与反击分析——在 (5,8) 落子，纵向 (3,8)(4,8)(5,8) 成活三（两端 (2,8)(6,8)），同时横向 (5,5)(5,6)(5,7)(5,8) 成冲四（唯一开口 (5,9)）；白方活三需两步才成活四，速度落后。候选评估——(5,8) 一子形成「四三」：冲四迫使白方必须封堵 (5,9)，随后黑方在 (6,8)（或 (2,8)）成活四，白方无法阻挡；备选 (9,2)/(9,6) 仅为被动防守。综合判断——(5,8) 是强制进攻杀着，最优。",
	"返回：{\"move\": [5, 8]}",
	"",
	"示例 2（进攻·双活三杀）：黑方执子。黑方横向两连 (5,3)(5,4) 与纵向两连 (3,5)(4,5)，(5,5) 为空。白方仅有活二 (12,4)(12,5)（两端 (12,3)(12,6) 为空）。",
	"思考：己方四——无。对方四——无冲四/活四，白方活二尚需三步才能成五，反击缓慢。活三候选与反击分析——在 (5,5) 落子，横向 (5,3)(5,4)(5,5) 与纵向 (3,5)(4,5)(5,5) 同时成活三，即双活三。候选评估——(5,5) 形成双活三，白方一步只能堵住其中一个活三，另一活三下一步即可成活四取胜；备选 (5,2)/(2,5) 只形成单个活三，白方可从容封堵，攻势不足。综合判断——(5,5) 双活三为必胜杀着，最优。",
	"返回：{\"move\": [5, 5]}",
	"",
	"示例 3（防守·一子双防）：白方执子。黑方横向活三 (4,5)(4,6)(4,7)，两端 (4,4)(4,8) 为空；黑方纵向眠三 (1,4)(2,4)(3,4)，(0,4) 已有白子，延伸点 (4,4) 为空。白方有横向两连 (10,10)(10,11)，(10,12) 为空。",
	"思考：己方四——无。对方四——无冲四/活四，但黑方活三下一步即成活四，必须立即堵其一端；黑方眠三的延伸点 (4,4) 若被黑方占据将成冲四。活三候选与反击分析——白方可在 (10,12) 一步成活三，但黑方威胁更急，应先防守。候选评估——(4,4) 一子双防：同时封堵活三端部与眠三延伸点，两个威胁一并化解；(4,8) 只能堵活三另一端，眠三威胁仍在；(10,12) 属缓手，放任黑方成活四。综合判断——(4,4) 双防点最优。",
	"返回：{\"move\": [4, 4]}",
	"",
	"# 坐标校验",
	"row 与 col 必须是 0 到 14 的整数，且目标交叉点必须为空；违反任何一条都是非法落子，你会收到纠正提示并重新选择。"
].join("\n");
/**
* Whether an intersection is inside the board and currently empty.
* @param board - row-major cell values (length must be BOARD_SIZE²).
* @param row - intersection row.
* @param col - intersection column.
* @returns true when the move may be played.
*/
function isLegalMove(board, row, col) {
	return row >= 0 && row < 15 && col >= 0 && col < 15 && board[row * 15 + col] === 0;
}
/**
* Render the board as the 16-line labeled text the prompt describes: a
* column-number header (digits aligned over their columns) followed by one
* line per row, each prefixed with its row number, one character per
* intersection.
* @param board - row-major cell values (length must be BOARD_SIZE²).
* @returns the labeled board text.
*/
function boardText(board) {
	const lines = [];
	lines.push(`   ${Array.from({ length: 15 }, (_, col) => String(col).padStart(3)).join("")}`);
	for (let row = 0; row < 15; row += 1) {
		let line = `${String(row).padStart(2)} `;
		for (let col = 0; col < 15; col += 1) {
			const cell = board[row * 15 + col];
			line += `  ${cell === 1 ? "B" : cell === 2 ? "W" : "·"}`;
		}
		lines.push(line);
	}
	return lines.join("\n");
}
/** Tolerant extraction of the JSON object region from a model reply (first `{` … last `}`). */
function jsonObjectRegion(text) {
	const start = text.indexOf("{");
	const end = text.lastIndexOf("}");
	if (start === -1 || end <= start) return void 0;
	return text.slice(start, end + 1);
}
/**
* Parse and shape-check one model reply into a {@link MoveReply}. The reply
* may wrap the JSON in prose or a code fence (models do), so the object
* region is extracted before parsing; the move coordinates themselves are
* still strictly validated here.
* @param text - the assembled model reply text.
* @returns the parsed reply.
*/
function parseMoveReply(text) {
	const region = jsonObjectRegion(text);
	if (region === void 0) return {
		kind: "invalid",
		reason: "回复中没有 JSON 对象"
	};
	let parsed;
	try {
		parsed = JSON.parse(region);
	} catch {
		return {
			kind: "invalid",
			reason: "回复中的 JSON 无法解析"
		};
	}
	if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return {
		kind: "invalid",
		reason: "回复不是 JSON 对象"
	};
	const value = parsed;
	const error = value.error;
	if (typeof error === "string") return {
		kind: "error",
		message: error
	};
	if (value.draw === true) return { kind: "draw" };
	const move = value.move;
	if (Array.isArray(move) && move.length === 2 && Number.isInteger(move[0]) && Number.isInteger(move[1]) && typeof move[0] === "number" && typeof move[1] === "number") {
		const row = move[0];
		const col = move[1];
		if (row < 0 || row >= 15 || col < 0 || col >= 15) return {
			kind: "invalid",
			reason: `落子坐标越界：[${row}, ${col}]`
		};
		return {
			kind: "move",
			row,
			col
		};
	}
	return {
		kind: "invalid",
		reason: "缺少合法的 move 字段（应为 [row, col] 整数坐标）"
	};
}
/** Translate a terminal finish reason into a move failure. */
function finishError(finish) {
	switch (finish.kind) {
		case "stop": return;
		case "error":
		case "aborted": {
			const error = new Error(finish.failure.message);
			error.code = finish.failure.code;
			return error;
		}
		case "max-tokens": return /* @__PURE__ */ new Error("gomoku: AI 回复超过最大输出长度");
		case "tool-calls": return /* @__PURE__ */ new Error("gomoku: AI 意外请求了工具调用");
		/* v8 ignore next -- closed-union exhaustiveness guard */
		default: return /* @__PURE__ */ new Error(`gomoku: unsupported finish reason "${String(finish.kind)}"`);
	}
}
/**
* Failure codes the move loop treats as transient, mirroring the harness's
* default provider retry policy (dsh-llm retry-policy.ts): a stream that
* dropped mid-response (e.g. pi-ai's "Stream ended without finish_reason") or
* a transient provider failure deserves one more attempt before the move
* request gives up. Auth, validation, and cancellation failures stay fatal.
*/
const RETRYABLE_MOVE_FAILURE_CODES = new Set([
	"EMPTY_RESPONSE",
	"RATE_LIMIT",
	"SERVER",
	"TIMEOUT",
	"TRANSPORT"
]);
/**
* Whether a thrown move-stream failure is transient and worth one retry.
* @param error - the error thrown by {@link streamMoveText}.
* @returns true when the failure carries one of the retryable codes.
*/
function isRetryableMoveFailure(error) {
	const code = error?.code;
	return typeof code === "string" && RETRYABLE_MOVE_FAILURE_CODES.has(code);
}
/**
* Run one AI move attempt: stream the framed board through the chosen
* provider/model route and assemble the reply text plus any reasoning blocks.
* The requested thinking level is forwarded only when the selected model
* advertises that exact effort; an unsupported level falls back to the
* model's own default instead of failing the attempt.
* @param ctx - host context exposing the llm service.
* @param request - the validated move request.
* @param system - the system prompt for this attempt.
* @param user - the user message for this attempt.
* @param maxTokens - the output-token cap for this attempt (per-request override or config default).
* @param signal - cancellation (request deadline / plugin disposal).
* @returns the assembled reply text, the reasoning text, and the truncation flag.
* @throws when the stream fails or the model produced no text at all.
*/
async function streamMoveText(ctx, request, system, user, maxTokens, signal) {
	let reasoningEffort;
	if (request.thinking !== void 0) {
		if ((await ctx.llm.resolveModelInfo(request.provider, request.model, signal)).reasoning?.efforts.some((effort) => effort.id === request.thinking)) reasoningEffort = ReasoningEffortId(request.thinking);
	}
	const options = {
		provider: request.provider,
		model: request.model,
		messages: [user],
		system,
		maxTokens,
		signal,
		...reasoningEffort !== void 0 ? { reasoningEffort } : {}
	};
	const assembler = new BlockAssembler();
	for await (const chunk of ctx.llm.stream(options)) {
		signal.throwIfAborted();
		assembler.push(chunk);
	}
	signal.throwIfAborted();
	const truncated = assembler.finish.kind === "max-tokens";
	const terminal = finishError(assembler.finish);
	if (terminal !== void 0 && !truncated) throw terminal;
	const blocks = assembler.blocks();
	const text = blocks.filter((block) => block.type === "text").map((block) => block.text).join(" ").trim();
	if (text.length === 0 && !truncated) throw new Error("gomoku: AI 没有返回任何内容");
	return {
		text,
		reasoning: blocks.filter((block) => block.type === "reasoning").map((block) => block.text).join(" ").trim(),
		truncated
	};
}
/**
* Validate an untrusted move-request body into a typed request.
* @param value - the parsed request body.
* @returns the validated request.
* @throws {Error} with a user-readable reason on the first invalid field.
*/
function validateMoveRequest(value) {
	if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("请求体必须是 JSON 对象");
	const candidate = value;
	if (typeof candidate.provider !== "string" || candidate.provider.length === 0) throw new Error("provider 必须是非空字符串");
	if (typeof candidate.model !== "string" || candidate.model.length === 0) throw new Error("model 必须是非空字符串");
	if (candidate.side !== "black" && candidate.side !== "white") throw new Error("side 必须是 \"black\" 或 \"white\"");
	if (candidate.thinking !== void 0 && candidate.thinking !== "off" && candidate.thinking !== "high" && candidate.thinking !== "max") throw new Error("thinking 必须是 \"off\"、\"high\" 或 \"max\"");
	if (candidate.moveTimeoutMs !== void 0 && (typeof candidate.moveTimeoutMs !== "number" || !Number.isInteger(candidate.moveTimeoutMs) || candidate.moveTimeoutMs < 1e3)) throw new Error("moveTimeoutMs 必须是 >= 1000 的整数毫秒数");
	if (candidate.maxMoveOutputTokens !== void 0 && (typeof candidate.maxMoveOutputTokens !== "number" || !Number.isInteger(candidate.maxMoveOutputTokens) || candidate.maxMoveOutputTokens < 8)) throw new Error("maxMoveOutputTokens 必须是 >= 8 的整数");
	const board = candidate.board;
	if (!Array.isArray(board) || board.length !== 225 || board.some((cell) => cell !== 0 && cell !== 1 && cell !== 2)) throw new Error(`board 必须是 225 个 0/1/2 组成的数组`);
	const system = candidate.system;
	if (system !== void 0 && typeof system !== "string") throw new Error("system 必须是字符串");
	return {
		provider: candidate.provider,
		model: candidate.model,
		side: candidate.side,
		board,
		...typeof system === "string" ? { system } : {},
		...candidate.thinking !== void 0 ? { thinking: candidate.thinking } : {},
		...candidate.moveTimeoutMs !== void 0 ? { moveTimeoutMs: candidate.moveTimeoutMs } : {},
		...candidate.maxMoveOutputTokens !== void 0 ? { maxMoveOutputTokens: candidate.maxMoveOutputTokens } : {}
	};
}
/** Frame the user message for one move attempt (board + side + optional corrective feedback). */
function buildMoveUserMessage(request, previous, reason) {
	const sideLabel = request.side === "black" ? "黑方" : "白方";
	const lines = [
		`你执${sideLabel}。当前棋盘（黑=B，白=W，空=·）：`,
		boardText(request.board),
		`轮到你（${sideLabel}）落子。请只返回合法的 JSON 落子。`
	];
	if (previous !== void 0 && reason !== void 0) {
		lines.push("", `警告：你上一次的返回不合法（${reason}），完整输出如下：`, previous);
		lines.push("你的上一次落子已被拒绝。请重新观察棋盘，选择另一个未被占用的空交叉点，不要输出任何思考过程或解释，只返回一个合法的 JSON 对象。");
	}
	return createUserMessage({
		content: [{
			type: "text",
			text: lines.join("\n")
		}],
		source: {
			kind: "plugin",
			plugin: PLUGIN_ID
		}
	});
}
/**
* Mount the gomoku plugin: the three routes plus the move-request lifecycle.
* @param ctx - host cordis context.
* @param config - validated loader configuration.
*/
function apply(ctx, config) {
	const resolved = {
		moveTimeoutMs: config.moveTimeoutMs,
		maxMoveOutputTokens: config.maxMoveOutputTokens,
		maxMoveAttempts: config.maxMoveAttempts
	};
	/** Collect the request body into a parsed JSON value. */
	const readJson = async (req) => {
		const chunks = [];
		for await (const chunk of req) chunks.push(chunk);
		const raw = Buffer.concat(chunks).toString("utf8");
		if (raw.length === 0) return {};
		return JSON.parse(raw);
	};
	ctx.effect(() => {
		const dispose = ctx.webServer.register({
			kind: "prefix",
			path: GOMOKU_PATH,
			handler: async (req, res) => {
				const writeJson = (status, body) => {
					res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
					res.end(JSON.stringify(body));
				};
				try {
					const segments = new URL(req.url ?? "/", "http://dsh.internal").pathname.slice(15).split("/").filter(Boolean);
					if (req.method === "GET" && segments.length === 1 && segments[0] === "prompt") {
						writeJson(200, { prompt: DEFAULT_SYSTEM_PROMPT });
						return;
					}
					if (req.method === "GET" && segments.length === 1 && segments[0] === "models") {
						const groups = [];
						const failures = [];
						for (const provider of ctx.llm.listProviders()) {
							let models;
							try {
								models = await ctx.llm.listModels(provider.id);
							} catch (error) {
								failures.push({
									provider: provider.id,
									error: error instanceof Error ? error.message : String(error)
								});
								continue;
							}
							groups.push({
								provider: provider.id,
								displayName: provider.name,
								models: models.map((model) => ({
									id: model.id,
									name: model.name
								}))
							});
						}
						writeJson(200, {
							groups,
							failures
						});
						return;
					}
					if (req.method === "POST" && segments.length === 1 && segments[0] === "move") {
						const request = validateMoveRequest(await readJson(req));
						const effectiveTimeoutMs = request.moveTimeoutMs ?? resolved.moveTimeoutMs;
						const effectiveMaxTokens = request.maxMoveOutputTokens ?? resolved.maxMoveOutputTokens;
						const controller = new AbortController();
						const timer = setTimeout(() => {
							controller.abort(/* @__PURE__ */ new Error("gomoku: AI 落子超时"));
						}, effectiveTimeoutMs);
						try {
							const system = request.system !== void 0 && request.system.trim().length > 0 ? request.system : DEFAULT_SYSTEM_PROMPT;
							let lastText;
							let lastReason;
							let lastReasoning = "";
							for (let attempt = 1; attempt <= resolved.maxMoveAttempts; attempt += 1) {
								const user = buildMoveUserMessage(request, lastText, lastReason);
								let attemptText;
								try {
									attemptText = await streamMoveText(ctx, request, system, user, effectiveMaxTokens, controller.signal);
								} catch (error) {
									if (!isRetryableMoveFailure(error)) throw error;
									lastText = void 0;
									lastReason = error instanceof Error ? error.message : String(error);
									lastReasoning = "";
									ctx.logger.warn("gomoku: transient AI move failure: %s", lastReason);
									if (attempt < resolved.maxMoveAttempts) continue;
									break;
								}
								const text = attemptText.text;
								lastReasoning = attemptText.reasoning;
								const reply = parseMoveReply(text);
								if (reply.kind === "move") {
									if (!isLegalMove(request.board, reply.row, reply.col)) {
										lastText = text;
										lastReason = `目标交叉点 [${reply.row}, ${reply.col}] 已被占用或越界`;
										continue;
									}
									writeJson(200, {
										move: {
											row: reply.row,
											col: reply.col
										},
										reasoning: lastReasoning
									});
									return;
								}
								if (reply.kind === "draw") {
									writeJson(200, {
										draw: true,
										reasoning: lastReasoning
									});
									return;
								}
								if (reply.kind === "error") {
									writeJson(200, {
										error: `AI 报告：${reply.message}`,
										reasoning: lastReasoning
									});
									return;
								}
								lastText = text;
								lastReason = attemptText.truncated ? "AI 回复被截断（超过最大输出长度），可能未输出完整的 JSON" : reply.reason;
							}
							writeJson(200, {
								error: `AI 连续 ${resolved.maxMoveAttempts} 次未能完成落子（最后原因：${lastReason ?? "未知"}）`,
								reasoning: lastReasoning
							});
						} finally {
							clearTimeout(timer);
						}
						return;
					}
					writeJson(404, { error: "unknown gomoku route" });
				} catch (error) {
					writeJson(400, { error: error instanceof Error ? error.message : String(error) });
				}
			}
		});
		return () => {
			dispose();
		};
	}, "gomoku: routes + move lifecycle");
}
//#endregion
export { BLACK, BOARD_SIZE, Config, DEFAULT_SYSTEM_PROMPT, EMPTY, GOMOKU_PATH, WHITE, apply, boardText, buildMoveUserMessage, inject, isLegalMove, isRetryableMoveFailure, name, parseMoveReply, validateMoveRequest };
