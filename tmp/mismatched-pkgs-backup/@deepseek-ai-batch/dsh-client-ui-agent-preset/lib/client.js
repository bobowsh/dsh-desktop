window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-agent-preset",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		//#region lib/types/client/locales.js
		/** Locale bundles for the agent-preset settings row, hero chip, header label, and management section. */
		/** English copy. */
		const en = {
			title: "Agent preset",
			description: "Applies to sessions you start from now on. Running sessions keep the preset they began with.",
			loading: "Loading presets…",
			error: "Could not load agent presets.",
			userTrust: "Custom",
			seatHint: "Agent preset for the session you are about to start",
			headerHint: "The agent preset this session runs, fixed when it started",
			nav: "Agent presets",
			sectionIntro: "A preset is the plugin composition one session's agent runs — its tools, prompt, and capabilities. Duplicate an existing one and make it yours, or let the agent draft one for you in Creator mode.",
			builtIn: "Built-in",
			setDefault: "Set as default",
			view: "View",
			presetStandardName: "Standard mode",
			presetStandardDescription: "Full coding agent with file editing, shell, file and web search, skills, planning, goals, subagents, and workflows.",
			presetPtcName: "PTC mode",
			presetPtcDescription: "All Standard mode capabilities, with tools exposed through the PTC mode SDK so the model can combine multi-step operations in one TypeScript program.",
			presetMinimalName: "Minimal mode",
			presetMinimalDescription: "Two-tool coding agent with persistent bash and str_replace_editor.",
			presetCordisName: "Creator mode",
			presetCordisDescription: "Built for creating custom agent presets, with all Standard mode capabilities plus runtime inspection, plugin experiments, and preset-authoring guidance.",
			duplicate: "Duplicate",
			duplicateUnavailable: "This deployment has no writable preset directory",
			delete: "Delete",
			presetId: "Identifier",
			presetIdPlaceholder: "my-agent",
			displayName: "Name",
			displayNamePlaceholder: "Shown in the picker; defaults to the identifier",
			inUse: "In use",
			builtInGroup: "Built-in",
			customGroup: "Custom",
			noDescription: "No description.",
			brokenBadge: "Failed to load",
			brokenNoCopy: "A preset that failed to load cannot be duplicated",
			switchRefused: "Could not switch to {name}: {reason}",
			copyOf: "Copied from",
			composition: "Composition (agent.cordis.yml)",
			cancel: "Cancel",
			close: "Close",
			retry: "Retry",
			copyTitle: "Duplicate preset",
			copyIntro: "The whole preset is copied on this machine. The identifier becomes its directory name and cannot be changed later; everything else is edited in the preset's own files.",
			create: "Create",
			creating: "Creating…",
			creatorDraft: "Draft a custom preset with Creator mode",
			openLocation: "Open folder",
			showLocation: "Show location",
			revealedPathLabel: "Preset files:",
			idRequired: "Give the preset an identifier.",
			idInvalid: "Use lowercase letters, digits, and hyphens, starting with a letter or digit.",
			idTaken: "A preset with this identifier already exists.",
			deleteTitle: "Delete this preset?",
			deleteDescription: "The preset directory is deleted. Sessions already running on it keep working; new sessions cannot select it.",
			deleteConfirm: "Delete",
			deleting: "Deleting…",
			importPreset: "Import",
			awesomePreset: "Awesome preset",
			searchPresets: "Search modes…",
			recentPresets: "Recent",
			builtInGroup: "Built-in",
			customGroup: "Custom",
			noMatchingPresets: "No matching modes",
			browseAwesomePresets: "Browse Awesome Presets…",
			exportPreset: "Export preset",
			importTitle: "Review preset package",
			importIntro: "Check the package details and choose the local identifier before importing it.",
			importSecurity: "Custom presets can run tools and commands with the same access as the agent. Import packages only from people you trust.",
			packageFile: "Package",
			packageContents: "Contents",
			packageContentsValue: "{count} files",
			packageVersion: "Created with DSH {version}",
			importWarningAbsolutePaths: "Some files contain absolute paths and may need editing on this computer.",
			importWarningPossibleSecrets: "Some files may contain API keys, tokens, or other secrets. Review them after importing.",
			importWarningVersionMismatch: "This package was created with another DSH version and may need changes.",
			importConfirm: "Import",
			importing: "Importing…",
			readingPackage: "Reading package…",
			exporting: "Exporting…",
			importFailed: "Could not import the preset package.",
			exportFailed: "Could not export the preset."
		};
		/** Simplified Chinese copy. */
		const zh = {
			title: "Agent 预设",
			description: "对此后新建的会话生效。运行中的会话保持它开始时的预设。",
			loading: "正在加载预设…",
			error: "无法加载 Agent 预设。",
			userTrust: "自定义",
			seatHint: "即将开始的这个会话所用的 Agent 预设",
			headerHint: "本会话运行的 Agent 预设，开始时即固定",
			nav: "Agent 预设",
			sectionIntro: "预设即一个会话的 Agent 所运行的插件组装 —— 它的工具、提示词与能力。复制一份既有预设改成自己的，或用「创造模式」让 Agent 帮你创建。",
			builtIn: "内置",
			setDefault: "设为默认",
			view: "查看",
			presetStandardName: "标准模式",
			presetStandardDescription: "功能完整的编码 Agent，支持文件编辑、Shell、文件与网页检索、Skills、计划、目标、子代理和工作流。",
			presetPtcName: "PTC 模式",
			presetPtcDescription: "具备标准模式的全部能力，并通过 PTC 模式 SDK 呈现工具，让模型用一个 TypeScript 程序组合多步操作。",
			presetMinimalName: "极简模式",
			presetMinimalDescription: "仅提供持久 bash 与 str_replace_editor 的双工具编码 Agent。",
			presetCordisName: "创造模式",
			presetCordisDescription: "用于创建自定义 Agent preset：具备标准模式的全部能力，并提供运行时检查、插件实验和 preset 创作指导。",
			duplicate: "复制",
			duplicateUnavailable: "此部署未配置可写的预设目录",
			delete: "删除",
			presetId: "标识符",
			presetIdPlaceholder: "my-agent",
			displayName: "名称",
			displayNamePlaceholder: "选择器中显示的名字，缺省用标识符",
			inUse: "当前使用",
			builtInGroup: "内置",
			customGroup: "自定义",
			noDescription: "暂无描述。",
			brokenBadge: "加载失败",
			brokenNoCopy: "预设加载失败，不能复制",
			switchRefused: "无法切换到「{name}」：{reason}",
			copyOf: "复制自",
			composition: "组装（agent.cordis.yml）",
			cancel: "取消",
			close: "关闭",
			retry: "重试",
			copyTitle: "复制预设",
			copyIntro: "整个预设会在本机复制一份。标识符将成为目录名，事后无法更改；其余内容之后直接在预设自己的文件里编辑。",
			create: "创建",
			creating: "正在创建…",
			creatorDraft: "用「创造模式」创作自定义预设",
			openLocation: "打开目录",
			showLocation: "查看路径",
			revealedPathLabel: "预设文件：",
			idRequired: "请填写标识符。",
			idInvalid: "只能使用小写字母、数字与连字符，且以字母或数字开头。",
			idTaken: "该标识符已被占用。",
			deleteTitle: "删除该预设？",
			deleteDescription: "预设目录将被删除。已在其上运行的会话不受影响；新会话将无法再选择它。",
			deleteConfirm: "删除",
			deleting: "正在删除…",
			importPreset: "导入",
			awesomePreset: "Awesome preset",
			searchPresets: "搜索模式…",
			recentPresets: "最近使用",
			builtInGroup: "内置",
			customGroup: "自定义",
			noMatchingPresets: "没有匹配的模式",
			browseAwesomePresets: "浏览 Awesome Presets…",
			exportPreset: "导出预设",
			importTitle: "确认预设包",
			importIntro: "导入前请确认压缩包信息，并选择它在本机使用的标识符。",
			importSecurity: "自定义预设可以使用与 Agent 相同权限的工具和命令。请只导入来自可信来源的预设包。",
			packageFile: "压缩包",
			packageContents: "内容",
			packageContentsValue: "{count} 个文件",
			packageVersion: "由 DSH {version} 创建",
			importWarningAbsolutePaths: "部分文件包含绝对路径，换到这台电脑后可能需要调整。",
			importWarningPossibleSecrets: "部分文件可能包含 API Key、Token 或其他密钥，请在导入后检查。",
			importWarningVersionMismatch: "该压缩包由另一个 DSH 版本创建，可能需要调整。",
			importConfirm: "导入",
			importing: "正在导入…",
			readingPackage: "正在读取压缩包…",
			exporting: "正在导出…",
			importFailed: "无法导入该预设压缩包。",
			exportFailed: "无法导出该预设。"
		};
		const BUILT_IN_PRESET_KEYS = {
			standard: {
				name: "presetStandardName",
				description: "presetStandardDescription"
			},
			ptc: {
				name: "presetPtcName",
				description: "presetPtcDescription"
			},
			minimal: {
				name: "presetMinimalName",
				description: "presetMinimalDescription"
			},
			cordis: {
				name: "presetCordisName",
				description: "presetCordisDescription"
			}
		};
		/**
		* Resolve preset display copy without making user-authored metadata translatable.
		* @param preset - roster row whose copy is being rendered.
		* @param t - active Web locale lookup.
		* @returns localized copy for a known shipped preset, otherwise file metadata.
		*/
		function presetDisplayText(preset, t) {
			const keys = preset.trust === "system" ? BUILT_IN_PRESET_KEYS[preset.id] : void 0;
			if (keys !== void 0) return {
				name: t(keys.name),
				description: t(keys.description)
			};
			return {
				name: preset.name ?? preset.id,
				...preset.description === void 0 ? {} : { description: preset.description }
			};
		}
		//#endregion
		//#region \0dsh-css:/private/tmp/claude-501/-Users-alex-Documents-Code-dataelem-dsh-desktop/8cafdb41-dc87-41ba-bba5-9afd99a08420/scratchpad/harness/packages/client/ui-agent-preset/src/client/AgentPresetLabel.module.css.mjs
		const css$3 = ".z0YmAa_label{background:var(--dsw-alias-fill-tsp-secondary);max-width:180px;height:22px;color:var(--dsw-alias-label-secondary);white-space:nowrap;text-overflow:ellipsis;border-radius:6px;align-items:center;gap:4px;padding:0 2px 0 0;font-size:12px;line-height:22px;display:inline-flex;overflow:hidden}.z0YmAa_icon{opacity:.7;flex:none}";
		const tagId$3 = "@deepseek-ai/dsh-client-ui-agent-preset/AgentPresetLabel.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$3) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-agent-preset";
			tag.dataset.pluginCss = tagId$3;
			tag.textContent = css$3;
			document.head.appendChild(tag);
		}
		var AgentPresetLabel_module_css_default = {
			"awesome": "z0YmAa_awesome",
			"awesomeArrow": "z0YmAa_awesomeArrow",
			"awesomeIcon": "z0YmAa_awesomeIcon",
			"awesomeText": "z0YmAa_awesomeText",
			"empty": "z0YmAa_empty",
			"groupLabel": "z0YmAa_groupLabel",
			"icon": "z0YmAa_icon",
			"picker": "z0YmAa_picker",
			"search": "z0YmAa_search",
			"searchIcon": "z0YmAa_searchIcon",
			"searchShell": "z0YmAa_searchShell",
			"selectedItem": "z0YmAa_selectedItem",
			"label": "z0YmAa_label"
		};
		//#endregion
		//#region lib/types/client/AgentPresetLabel.js
		/**
		* The session header's agent-preset label.
		*
		* Read-only by construction: a session's composition is fixed once its
		* conversation starts, and a header is only worth reading after that. Offering
		* a control here would promise a switch the host refuses; naming what the
		* session runs is the honest affordance, and the choice itself lives on the
		* new-session screen ({@link AgentPresetSeat}).
		*/
		/**
		* Render this session's agent-preset name beside its title.
		* @param props - composed slot props.
		* @returns the label, or null when the session records no preset.
		*/
		function AgentPresetLabel({ sessionId, useSessions, useAgentPresets, load, t }) {
			const preset = useSessions((state) => {
				const value = state.byId[sessionId]?.projectionValues?.agentPreset;
				return typeof value === "string" ? value : void 0;
			});
			const options = useAgentPresets((state) => state.options);
			(0, react.useEffect)(() => {
				if (preset !== void 0) load();
			}, [preset, load]);
			if (preset === void 0) return null;
			const option = options.find((entry) => entry.id === preset);
			const text = option === void 0 ? void 0 : presetDisplayText(option, t);
			return (0, react_jsx_runtime.jsxs)("span", {
				className: AgentPresetLabel_module_css_default.label,
				title: text?.description ?? t("headerHint"),
				children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconAgentPresetOutline16, {
					size: 14,
					className: AgentPresetLabel_module_css_default.icon
				}), text?.name ?? preset]
			});
		}
		//#endregion
		//#region lib/types/client/PresetMenu.js
		/**
		* The preset picker both surfaces render: a menu of presets over a button
		* naming the current one.
		*
		* The settings row and the composer seat differ in where they sit, what they
		* call the current value, and when they refuse a pick — not in how the picker
		* itself behaves. Trust is the one thing the list always says: a locally
		* authored preset is exactly as privileged as the plugins it names, so the
		* label marks it rather than presenting every preset as shipped and vetted.
		*/
		/**
		* Render the preset picker.
		* @param props - the calling surface's copy, styling, and handlers.
		* @returns the menu and its trigger.
		*/
		function PresetMenu({ options, selectedId, label, t, buttonClassName, chevronClassName, disabled, open, onOpenChange, onSelect }) {
			return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
				open,
				onClose: () => {
					onOpenChange(false);
				},
				items: options.map((option) => {
					const name = presetDisplayText(option, t).name;
					return {
						id: option.id,
						label: option.trust === "user" ? `${name} · ${t("userTrust")}` : name
					};
				}),
				selectedId,
				onSelect: (id) => {
					onOpenChange(false);
					onSelect(id);
				},
				align: "end",
				portal: true,
				anchor: (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: buttonClassName,
					"aria-haspopup": "menu",
					"aria-expanded": open,
					disabled,
					onClick: () => {
						onOpenChange(!open);
					},
					children: [label, (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { className: chevronClassName })]
				})
			});
		}
		//#endregion
		//#region \0dsh-css:/private/tmp/claude-501/-Users-alex-Documents-Code-dataelem-dsh-desktop/8cafdb41-dc87-41ba-bba5-9afd99a08420/scratchpad/harness/packages/client/ui-agent-preset/src/client/AgentPresetRow.module.css.mjs
		const css$2 = ".So_sFq_row{border-bottom:1px solid var(--dsw-alias-border-l2);align-items:center;gap:8px;padding:16px 0;display:flex}.So_sFq_rowText{flex-direction:column;flex:1;gap:4px;min-width:0;padding-right:48px;display:flex}.So_sFq_title{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:400;line-height:22px}.So_sFq_desc{color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:400;line-height:18px}.So_sFq_selector{background:var(--dsw-alias-bg-module-platform);height:36px;font:inherit;color:var(--dsw-alias-label-primary);cursor:pointer;border:none;border-radius:18px;align-items:center;gap:12px;padding:0 14px;font-size:14px;line-height:22px;display:inline-flex}.So_sFq_selector:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.So_sFq_selector:disabled{cursor:default}.So_sFq_chevron{flex:none}";
		const tagId$2 = "@deepseek-ai/dsh-client-ui-agent-preset/AgentPresetRow.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-agent-preset";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		var AgentPresetRow_module_css_default = {
			"chevron": "So_sFq_chevron",
			"desc": "So_sFq_desc",
			"row": "So_sFq_row",
			"rowText": "So_sFq_rowText",
			"selector": "So_sFq_selector",
			"title": "So_sFq_title"
		};
		//#endregion
		//#region lib/types/client/AgentPresetRow.js
		/**
		* Agent-preset preference row: the preset new sessions are composed from.
		* A running session keeps the composition it began with, so this row never
		* disturbs work in progress.
		*/
		/**
		* Render the new-session agent-preset selector.
		* @param props - composed slot props.
		* @returns the row, or null when the deployment composes no presets.
		*/
		function AgentPresetRow({ load, select, useAgentPreset, t }) {
			const state = useAgentPreset((snapshot) => snapshot);
			const [open, setOpen] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				load();
			}, [load]);
			(0, react.useEffect)(() => {
				if (state.writable && state.status !== "unavailable") return;
				setOpen(false);
			}, [state.status, state.writable]);
			if (state.status === "unavailable") return null;
			const busy = state.status === "loading" || state.status === "saving";
			const chosen = state.options.find((option) => option.id === state.currentValue);
			const chosenText = chosen === void 0 ? void 0 : presetDisplayText(chosen, t);
			const label = state.currentValue === "" ? t("loading") : chosenText?.name ?? state.currentValue;
			const description = state.error ?? t("description");
			return (0, react_jsx_runtime.jsxs)("div", {
				className: AgentPresetRow_module_css_default.row,
				children: [(0, react_jsx_runtime.jsxs)("div", {
					className: AgentPresetRow_module_css_default.rowText,
					children: [(0, react_jsx_runtime.jsx)("div", {
						className: AgentPresetRow_module_css_default.title,
						children: t("title")
					}), (0, react_jsx_runtime.jsx)("div", {
						className: AgentPresetRow_module_css_default.desc,
						role: state.error === null ? void 0 : "alert",
						children: description
					})]
				}), (0, react_jsx_runtime.jsx)(PresetMenu, {
					options: state.options,
					selectedId: state.currentValue,
					label,
					t,
					buttonClassName: AgentPresetRow_module_css_default.selector,
					chevronClassName: AgentPresetRow_module_css_default.chevron,
					disabled: busy || !state.writable || state.options.length === 0,
					open,
					onOpenChange: setOpen,
					onSelect: (id) => {
						select(id);
					}
				})]
			});
		}
		//#endregion
		//#region \0dsh-css:/private/tmp/claude-501/-Users-alex-Documents-Code-dataelem-dsh-desktop/8cafdb41-dc87-41ba-bba5-9afd99a08420/scratchpad/harness/packages/client/ui-agent-preset/src/client/AgentPresetSeat.module.css.mjs
		const css$1 = "._4FiJda_seat{max-width:min(100%,240px);min-height:28px;color:var(--dsw-alias-label-primary);white-space:nowrap;text-overflow:ellipsis;cursor:pointer;background:0 0;border:none;border-radius:16px;align-items:center;gap:4px;padding:0 8px;font-size:13px;font-weight:500;line-height:20px;display:inline-flex;overflow:hidden}._4FiJda_seat:not(:disabled):hover,._4FiJda_seat[aria-expanded=true]{background:var(--dsw-alias-interactive-bg-hover)}._4FiJda_seat:disabled{cursor:default;color:var(--dsw-alias-label-quaternary)}._4FiJda_seatIcon{color:var(--dsw-alias-label-primary);flex:none}._4FiJda_introIcon{animation:.15s cubic-bezier(.16,1,.3,1) both _4FiJda_seat-icon-in}@keyframes _4FiJda_seat-icon-in{0%{opacity:0;transform:scale(.5)}to{opacity:1;transform:scale(1)}}._4FiJda_introText{white-space:pre;display:inline-block}._4FiJda_introChar{white-space:pre;opacity:0;animation:.4s ease-out forwards _4FiJda_seat-char-in;display:inline-block}@keyframes _4FiJda_seat-char-in{0%{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}@media (prefers-reduced-motion:reduce){._4FiJda_searchShell,._4FiJda_item,._4FiJda_awesome{transition:none}}._4FiJda_chevron{color:var(--dsw-alias-label-caption);flex:none}._4FiJda_picker{min-width:360px}._4FiJda_searchShell{box-sizing:border-box;width:100%;height:36px;color:var(--dsw-alias-label-caption);background:var(--dsw-alias-bg-module-platform);border:1px solid var(--dsw-alias-border-l2);border-radius:10px;align-items:center;gap:8px;padding:0 10px;display:flex;transition:border-color .15s ease,box-shadow .15s ease,background .15s ease}._4FiJda_searchShell:focus-within{background:var(--dsw-alias-bg-base);border-color:#4d6bfe;box-shadow:0 0 0 3px #4d6bfe1f}._4FiJda_searchIcon{flex:none}._4FiJda_search{min-width:0;width:100%;height:100%;color:var(--dsw-alias-label-primary);background:0 0;border:0;outline:0;padding:0;font:inherit}._4FiJda_search::-webkit-search-cancel-button{opacity:.55}._4FiJda_groupLabel{width:100%;color:var(--dsw-alias-label-caption);text-transform:none;letter-spacing:.02em;border-top:1px solid var(--dsw-alias-border-l3);padding-top:10px;font-size:11px;font-weight:500;line-height:16px;display:block}._4FiJda_item{box-sizing:border-box;flex-direction:column;gap:1px;width:336px;min-width:0;border-radius:9px;padding:7px 10px;display:flex;transition:background .12s ease,transform .12s ease}._4FiJda_item:hover{background:var(--dsw-alias-interactive-bg-hover)}._4FiJda_selectedItem{background:#4d6bfe12}._4FiJda_selectedItem:hover{background:#4d6bfe1c}._4FiJda_itemName{color:var(--dsw-alias-label-primary);white-space:nowrap;text-overflow:ellipsis;overflow:hidden;font-size:13px;font-weight:500;line-height:19px}._4FiJda_itemDesc{color:var(--dsw-alias-label-tertiary);white-space:nowrap;text-overflow:ellipsis;overflow:hidden;font-size:12px;line-height:17px}._4FiJda_empty{color:var(--dsw-alias-label-caption);text-align:center;padding:20px 8px;display:block}._4FiJda_awesome{box-sizing:border-box;width:336px;color:#3154df;background:#4d6bfe0d;border-radius:9px;align-items:center;gap:8px;padding:9px 10px;font-weight:500;display:flex;transition:background .12s ease}._4FiJda_awesome:hover{background:#4d6bfe18}._4FiJda_awesomeIcon{flex:none}._4FiJda_awesomeText{flex:1}._4FiJda_awesomeArrow{opacity:.6;font-size:15px}[role=menu]:has(._4FiJda_searchShell){width:376px!important;max-width:calc(100vw - 24px);max-height:min(360px,calc(100vh - 24px))!important;border-radius:14px!important;box-shadow:0 18px 46px #0000001f,0 3px 10px #00000012!important;overflow:hidden}[role=menu]:has(._4FiJda_searchShell)>[role=presentation]:first-child{min-height:0;padding:8px!important;overflow-y:auto!important}[role=menu]:has(._4FiJda_searchShell) [role=menuitem]{border-radius:9px!important;margin:1px 0!important;padding:0!important}[role=menu]:has(._4FiJda_searchShell)>[role=presentation]:last-child{flex:none;padding:8px!important}";
		const tagId$1 = "@deepseek-ai/dsh-client-ui-agent-preset/AgentPresetSeat.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-agent-preset";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var AgentPresetSeat_module_css_default = {
			"chevron": "_4FiJda_chevron",
			"introChar": "_4FiJda_introChar",
			"introIcon": "_4FiJda_introIcon",
			"introText": "_4FiJda_introText",
			"item": "_4FiJda_item",
			"itemDesc": "_4FiJda_itemDesc",
			"itemName": "_4FiJda_itemName",
			"seat": "_4FiJda_seat",
			"seat-char-in": "_4FiJda_seat-char-in",
			"seat-icon-in": "_4FiJda_seat-icon-in",
			"seatIcon": "_4FiJda_seatIcon"
		};
		//#endregion
		//#region lib/types/client/AgentPresetSeat.js
		/**
		* The agent-preset chip on the new-session screen, beside the workspace
		* picker.
		*
		* It lives here rather than in the composer because the choice is only
		* available before a conversation starts: once a turn has run, the session's
		* history was produced under that preset's tools and the host refuses to swap
		* them. A control that spends most of its life disabled belongs on the screen
		* where it still works.
		*
		* The menu opens on the staged choice, which starts as the deployment default.
		* Picking stages; the choice reaches a session when one becomes current.
		*/
		const INTRO_TEXT_DELAY_MS = 150;
		const INTRO_CHAR_STAGGER_MS = 40;
		const INTRO_TEXT_REVEAL_MS = 200;
		const INTRO_CHAR_FADE_MS = 400;
		const RECENT_PRESETS_KEY = "dsh-agent-preset-recent";
		const AWESOME_PRESETS_ID = "__awesome_presets__";
		/**
		* How long a refused switch holds before fading.
		*
		* Longer than the primitive's default because this banner is the only place
		* the refusal appears. The chip's label has already snapped back to the
		* preset the session still runs, and a preset the host refuses to MOUNT is
		* one discovery reported healthy — its row on the settings page carries no
		* reason to go back and read, because there was nothing to see until the
		* rows actually ran.
		*/
		const REFUSAL_HOLD_MS = 8e3;
		/**
		* Per-character start offset for the introduce reveal.
		* @param count - character count of the shown preset name.
		* @returns milliseconds between successive character starts.
		*/
		function introStaggerMs(count) {
			if (count <= 1) return 0;
			return Math.min(INTRO_CHAR_STAGGER_MS, INTRO_TEXT_REVEAL_MS / (count - 1));
		}
		/**
		* Render the new-session agent-preset chip.
		* @param props - composed slot props.
		* @returns the chip, or null when the deployment composes no presets.
		*/
		function AgentPresetSeat({ load, select, introduced, useAgentPresetSeat, t }) {
			const state = useAgentPresetSeat((snapshot) => snapshot);
			const [open, setOpen] = (0, react.useState)(false);
			const [query, setQuery] = (0, react.useState)("");
			const [recentIds, setRecentIds] = (0, react.useState)(() => {
				try {
					const value = JSON.parse(window.localStorage.getItem(RECENT_PRESETS_KEY) ?? "[]");
					return Array.isArray(value) ? value.filter((id) => typeof id === "string").slice(0, 4) : [];
				} catch {
					return [];
				}
			});
			const toastSeq = (0, react.useRef)(0);
			const [toast, setToast] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				load();
			}, [load]);
			const chosen = state.options.find((option) => option.id === state.current);
			const label = (chosen === void 0 ? void 0 : presetDisplayText(chosen, t))?.name ?? state.current;
			const ready = state.options.length > 0 && state.current !== "";
			const [introducing, setIntroducing] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				if (!state.introduce || !ready) return;
				const characters = Array.from(label);
				if (characters.length === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
					introduced();
					return;
				}
				setIntroducing(true);
				const done = window.setTimeout(() => {
					setIntroducing(false);
					introduced();
				}, INTRO_TEXT_DELAY_MS + (characters.length - 1) * introStaggerMs(characters.length) + INTRO_CHAR_FADE_MS);
				return () => {
					window.clearTimeout(done);
				};
			}, [
				state.introduce,
				ready,
				label,
				introduced
			]);
			if (!ready) return null;
			const characters = Array.from(label);
			const stagger = introStaggerMs(characters.length);
			const shownLabel = introducing ? (0, react_jsx_runtime.jsx)("span", {
				className: AgentPresetSeat_module_css_default.introText,
				children: characters.map((character, index) => (0, react_jsx_runtime.jsx)("span", {
					className: AgentPresetSeat_module_css_default.introChar,
					style: { animationDelay: `${INTRO_TEXT_DELAY_MS + index * stagger}ms` },
					children: character
				}, index))
			}) : label;
			const normalizedQuery = query.trim().toLocaleLowerCase();
			const matching = state.options.filter((option) => {
				if (normalizedQuery === "") return true;
				const text = presetDisplayText(option, t);
				return `${text.name} ${text.description ?? ""} ${option.id}`.toLocaleLowerCase().includes(normalizedQuery);
			});
			const itemOf = (option) => {
				const text = presetDisplayText(option, t);
				return {
					id: option.id,
					label: (0, react_jsx_runtime.jsxs)("span", {
						className: `${AgentPresetSeat_module_css_default.item} ${option.id === state.current ? AgentPresetSeat_module_css_default.selectedItem : ""}`,
						children: [(0, react_jsx_runtime.jsx)("span", {
							className: AgentPresetSeat_module_css_default.itemName,
							children: text.name
						}), (0, react_jsx_runtime.jsx)("span", {
							className: AgentPresetSeat_module_css_default.itemDesc,
							children: text.description ?? t("noDescription")
						})]
					})
				};
			};
			const searchField = (0, react_jsx_runtime.jsxs)("span", {
				className: AgentPresetSeat_module_css_default.searchShell,
				children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutline16, {
					size: 16,
					className: AgentPresetSeat_module_css_default.searchIcon
				}), (0, react_jsx_runtime.jsx)("input", {
					className: AgentPresetSeat_module_css_default.search,
					type: "search",
					value: query,
					autoFocus: true,
					placeholder: t("searchPresets"),
					"aria-label": t("searchPresets"),
					onChange: (event) => {
						setQuery(event.currentTarget.value);
					},
					onKeyDown: (event) => {
						event.stopPropagation();
					}
				})]
			});
			const entries = [{
				type: "label",
				id: "preset-search",
				text: searchField
			}];
			const addGroup = (id, title, options) => {
				if (options.length === 0) return;
				entries.push({
					type: "label",
					id: `${id}-label`,
					text: (0, react_jsx_runtime.jsx)("span", { className: AgentPresetSeat_module_css_default.groupLabel, children: title })
				}, ...options.map(itemOf));
			};
			const recentOptions = normalizedQuery === "" ? recentIds.map((id) => matching.find((option) => option.id === id)).filter((option) => option !== void 0) : [];
			const recentSet = new Set(recentOptions.map((option) => option.id));
			addGroup("recent", t("recentPresets"), recentOptions);
			addGroup("built-in", t("builtInGroup"), matching.filter((option) => option.trust === "system" && !recentSet.has(option.id)));
			addGroup("custom", t("customGroup"), matching.filter((option) => option.trust === "user" && !recentSet.has(option.id)));
			if (matching.length === 0) entries.push({
				type: "label",
				id: "preset-empty",
				text: (0, react_jsx_runtime.jsx)("span", { className: AgentPresetSeat_module_css_default.empty, children: t("noMatchingPresets") })
			});
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
				open,
				onClose: () => {
					setOpen(false);
					setQuery("");
				},
				items: entries,
				footer: [{
					id: AWESOME_PRESETS_ID,
					label: (0, react_jsx_runtime.jsxs)("span", {
						className: AgentPresetSeat_module_css_default.awesome,
						children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSparkle16, {
							size: 16,
							className: AgentPresetSeat_module_css_default.awesomeIcon
						}), (0, react_jsx_runtime.jsx)("span", {
							className: AgentPresetSeat_module_css_default.awesomeText,
							children: t("browseAwesomePresets")
						}), (0, react_jsx_runtime.jsx)("span", {
							className: AgentPresetSeat_module_css_default.awesomeArrow,
							children: "\u2192"
						})]
					})
				}],
				selectedId: state.current,
				onSelect: (id) => {
					setOpen(false);
					setQuery("");
					if (id === AWESOME_PRESETS_ID) {
						window.open("https://www.dshdesktop.com/preset/", "_blank", "noopener,noreferrer");
						return;
					}
					const nextRecent = [id, ...recentIds.filter((recentId) => recentId !== id)].slice(0, 4);
					setRecentIds(nextRecent);
					try {
						window.localStorage.setItem(RECENT_PRESETS_KEY, JSON.stringify(nextRecent));
					} catch {}
					const picked = state.options.find((option) => option.id === id);
					/* v8 ignore next */
					const name = picked === void 0 ? id : presetDisplayText(picked, t).name;
					select(id).then((refusal) => {
						if (refusal === void 0) return;
						toastSeq.current += 1;
						setToast({
							seq: toastSeq.current,
							text: t("switchRefused", {
								name,
								reason: refusal
							})
						});
					});
				},
				align: "start",
				side: "bottom",
				portal: true,
				compact: true,
				className: AgentPresetSeat_module_css_default.picker,
				anchor: (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: AgentPresetSeat_module_css_default.seat,
					"aria-haspopup": "menu",
					"aria-expanded": open,
					title: state.error ?? t("seatHint"),
					disabled: state.busy,
					onClick: () => {
						setOpen((value) => !value);
					},
					children: [
						(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconAgentPresetOutline16, { className: introducing ? `${AgentPresetSeat_module_css_default.seatIcon} ${AgentPresetSeat_module_css_default.introIcon}` : AgentPresetSeat_module_css_default.seatIcon }),
						shownLabel,
						(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { className: AgentPresetSeat_module_css_default.chevron })
					]
				})
			}), toast !== null && (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Toast, {
				text: toast.text,
				icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, {}),
				holdMs: REFUSAL_HOLD_MS,
				anchor: document.querySelector("[data-composer-card]"),
				onDone: () => {
					setToast(null);
				}
			}, toast.seq)] });
		}
		//#endregion
		//#region lib/types/client/settings-store.js
		/**
		* Agent-preset default-settings controller.
		*
		* Options and the current default both come from one `agentPresets.list` call:
		* the roster already reports which id a session with no explicit choice gets,
		* so the row needs no schema introspection. Writes target the settings
		* namespace's `default` field, which is what the host resolves at creation.
		*/
		/** The agent-preset settings namespace on the host wire. */
		const AGENT_PRESET_SETTINGS_NS = "agent-presets";
		/**
		* Human text for a rejected wire call. A transport failure rejects with an
		* Error; a host or a runtime can reject with anything, and the surface still
		* has to say something.
		* @param error - the rejection value.
		* @returns the message to show.
		*/
		function messageOf(error) {
			return error instanceof Error ? error.message : String(error);
		}
		/**
		* Persist one preset as the default for sessions created later.
		*
		* The default is a settings field rather than a preset property, so both the
		* General row and the management section write it here — one home for which
		* namespace and field the host resolves at session creation.
		* @param api - the settings wire face.
		* @param id - the preset to make default.
		* @returns the failure message, or undefined once the write landed.
		*/
		async function writeDefaultPreset(api, id) {
			let response;
			try {
				response = await api.settings.update(AGENT_PRESET_SETTINGS_NS, { default: id }, void 0);
			} catch (error) {
				return messageOf(error);
			}
			return response.ok ? void 0 : response.error.message;
		}
		const EMPTY_ROSTER = {
			presets: [],
			authorable: false
		};
		/**
		* Read the roster, folding both refusal shapes into one message.
		*
		* The wire refuses in two ways — the transport rejects, or it answers an
		* `ok: false` envelope — and every surface treats them identically. Folding
		* them here keeps each store's `load` about what it does with a roster rather
		* than about how the call can fail.
		* @param remote - the agent-preset Remote namespace.
		* @returns the roster, or the message to show in its place.
		*/
		async function readRoster(remote) {
			try {
				const result = await remote.agentPresets.list();
				if (result.ok) return {
					ok: true,
					value: result.value
				};
				if (result.error.code === "invocation-unavailable") return {
					ok: true,
					value: EMPTY_ROSTER
				};
				return {
					ok: false,
					error: result.error.message
				};
			} catch (error) {
				return {
					ok: false,
					error: messageOf(error)
				};
			}
		}
		/**
		* The opening move every roster-backed surface makes: refuse a read that is
		* already in flight, mark the store loading, then read.
		*
		* A surface that gets `undefined` returns without touching its snapshot
		* further — either another read owns it, or this one already wrote the
		* failure. What differs between surfaces starts after this.
		* @param remote - the agent-preset Remote namespace.
		* @param store - the surface's own snapshot store.
		* @returns the roster, or undefined when the caller should return.
		*/
		async function beginRosterRead(remote, store) {
			const before = store.getSnapshot();
			if (before.status === "loading") return void 0;
			store.set({
				...before,
				status: "loading",
				error: null
			});
			const roster = await readRoster(remote);
			if (roster.ok) return roster.value;
			store.set({
				...store.getSnapshot(),
				status: "error",
				error: roster.error
			});
		}
		/**
		* The roster entries as the pickers render them: healthy presets only.
		*
		* The chip and the row exist to choose the NEXT session's composition, and a
		* broken preset cannot compose one — offering it would defer the discovery
		* of that fact to a failed session start. The management section renders the
		* full roster (broken rows included) from its own store instead.
		*
		* The chip, the row, and the management section all show the same facts, and
		* `exactOptionalPropertyTypes` makes "absent" and "present as undefined"
		* different shapes — so the spread dance belongs in one place rather than
		* once per store.
		* @param presets - the roster the host answered with.
		* @returns one option per selectable preset, in roster order.
		*/
		function presetOptions(presets) {
			return presets.filter((preset) => preset.broken === void 0).map((preset) => ({
				id: preset.id,
				trust: preset.trust,
				...preset.name === void 0 ? {} : { name: preset.name },
				...preset.description === void 0 ? {} : { description: preset.description }
			}));
		}
		const INITIAL$2 = {
			status: "idle",
			error: null,
			writable: true,
			currentValue: "",
			options: []
		};
		/** Reads the roster and persists the chosen default. */
		var AgentPresetSettingsController = class {
			api;
			remote;
			describeFace;
			/** Row snapshot the renderer subscribes to. */
			store = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(INITIAL$2);
			/**
			* @param api - the settings wire face (the default write).
			* @param remote - the agent-preset Remote namespace (the roster read).
			* @param describeFace - the shared mirror's describe face (writability source).
			*/
			constructor(api, remote, describeFace) {
				this.api = api;
				this.remote = remote;
				this.describeFace = describeFace;
			}
			set(patch) {
				this.store.set({
					...this.store.getSnapshot(),
					...patch
				});
			}
			/**
			* Load the roster. An empty roster means the deployment composes no
			* presets, which is a valid deployment rather than a failure — the row
			* reports `unavailable` and renders nothing.
			* @returns once the snapshot reflects the host.
			*/
			async load() {
				const roster = await beginRosterRead(this.remote, this.store);
				if (roster === void 0) return;
				const { presets } = roster;
				const [first] = presets;
				if (first === void 0) {
					this.set({
						status: "unavailable",
						options: [],
						currentValue: ""
					});
					return;
				}
				await this.describeFace.ensure();
				this.set({
					status: "ready",
					error: null,
					writable: this.describeFace.getSnapshot().view?.writable ?? false,
					options: presetOptions(presets),
					currentValue: presets.find((preset) => preset.isDefault)?.id ?? first.id
				});
			}
			/**
			* Persist one preset as the default for sessions created later. Running
			* sessions keep the composition they were created with, so this never
			* disturbs work in progress.
			* @param id - the preset to make default.
			* @returns once the write settled and the roster was re-read.
			*/
			async select(id) {
				const before = this.store.getSnapshot();
				if (before.status === "saving" || id === before.currentValue) return;
				this.set({
					status: "saving",
					error: null,
					currentValue: id
				});
				const failure = await writeDefaultPreset(this.api, id);
				if (failure !== void 0) {
					this.set({
						status: "ready",
						currentValue: before.currentValue,
						error: failure
					});
					return;
				}
				await this.load();
			}
		};
		//#endregion
		//#region lib/types/client/section-store.js
		/**
		* Agent-preset management controller: the roster as a list, a copy dialog as
		* the only way a preset is created, and a read-only viewer over the shipped
		* compositions.
		*
		* The browser edits no composition text. A new preset is a host-side copy of
		* an existing one (`{ from, id, name? }` is all that crosses the wire), and
		* everything after creation happens in the preset's own files — which is why
		* the page's other job is getting the user TO those files: open the directory
		* where the host has a desktop, show its path where it does not.
		*
		* The host stays the single fact source. Every mutation writes through the
		* wire and the page re-reads the roster afterwards, because a copy changes
		* more than the row it targeted.
		*/
		/** Ids a preset directory may be named, mirroring the host's own rule. */
		const PRESET_ID = /^[a-z0-9][a-z0-9-]*$/;
		const INITIAL$1 = {
			status: "idle",
			error: null,
			authorable: false,
			hasDocument: false,
			rows: [],
			copy: null,
			view: null,
			import: null,
			exporting: null,
			pendingDelete: null,
			deleting: false,
			revealedPaths: {}
		};
		/**
		* Why this copy cannot be submitted yet, as a locale key, or undefined when
		* it can. Client-side only: the host re-checks the id and its answer is what
		* the dialog reports on failure.
		* @param draft - the open copy dialog.
		* @param rows - the roster, for the collision check.
		* @returns the blocking reason's locale key, or undefined when submittable.
		*/
		function draftBlocker(draft, rows) {
			if (draft.id === "") return "idRequired";
			if (!PRESET_ID.test(draft.id)) return "idInvalid";
			if (rows.some((row) => row.id === draft.id)) return "idTaken";
		}
		async function presetTransferError(response, fallback) {
			try {
				const body = await response.json();
				if (typeof body?.error === "string" && body.error !== "") return body.error;
			} catch {}
			return fallback;
		}
		/** Reads the roster and drives the copy dialog, viewer, and location reveals. */
		var AgentPresetSectionController = class {
			remote;
			rosterChanged;
			/** Page snapshot the renderer subscribes to. */
			store = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(INITIAL$1);
			constructor(remote, rosterChanged = () => {}) {
				this.remote = remote;
				this.rosterChanged = rosterChanged;
			}
			set(patch) {
				this.store.set({
					...this.store.getSnapshot(),
					...patch
				});
			}
			patchCopy(patch) {
				const { copy } = this.store.getSnapshot();
				if (copy === null) return;
				this.set({ copy: {
					...copy,
					...patch
				} });
			}
			/**
			* Load the roster. An empty roster means the deployment composes no
			* presets, which is a valid deployment rather than a failure — the section
			* reports `unavailable` and renders nothing.
			* @returns once the snapshot reflects the host.
			*/
			async load() {
				const opener = this.remote.settings.canOpenAgentPresetDirectory();
				const roster = await beginRosterRead(this.remote, this.store);
				const described = await opener.catch(() => void 0);
				if (roster === void 0) return;
				const { presets, authorable } = roster;
				const hasDocument = described?.ok === true && described.value;
				if (presets.length === 0) {
					this.set({
						status: "unavailable",
						rows: [],
						authorable,
						hasDocument,
						copy: null,
						view: null
					});
					return;
				}
				const revealed = this.store.getSnapshot().revealedPaths;
				const kept = Object.fromEntries(Object.entries(revealed).filter(([id]) => presets.some((preset) => preset.id === id)));
				this.set({
					status: "ready",
					error: null,
					authorable,
					hasDocument,
					rows: presets.map((preset) => ({ ...preset })),
					revealedPaths: kept
				});
			}
			/**
			* Open one shipped preset's composition in the read-only viewer.
			* @param id - the preset to view.
			* @returns once the composition loaded or the failure is on the page.
			*/
			async view(id) {
				this.set({ error: null });
				try {
					const result = await this.remote.agentPresets.read(id);
					if (!result.ok) {
						this.set({ error: result.error.message });
						return;
					}
					const { name, content } = result.value;
					this.set({ view: {
						id,
						title: name ?? id,
						content
					} });
				} catch (error) {
					this.set({ error: messageOf(error) });
				}
			}
			/** Close the read-only viewer. */
			closeView() {
				this.set({ view: null });
			}
			/**
			* Open the copy dialog over one preset.
			* @param from - the preset the copy will start from.
			*/
			beginCopy(from) {
				const row = this.store.getSnapshot().rows.find((candidate) => candidate.id === from);
				this.set({
					error: null,
					copy: {
						from,
						fromTitle: row?.name ?? from,
						id: "",
						name: "",
						saving: false,
						error: null
					}
				});
			}
			/** Close the copy dialog, discarding whatever was typed. */
			cancelCopy() {
				this.set({ copy: null });
			}
			/**
			* Name the preset the copy creates.
			* @param id - the id typed into the dialog.
			*/
			setCopyId(id) {
				this.patchCopy({
					id,
					error: null
				});
			}
			/**
			* Name the copy's display name.
			* @param name - the display name typed into the dialog.
			*/
			setCopyName(name) {
				this.patchCopy({
					name,
					error: null
				});
			}
			/**
			* Submit the copy, re-read the roster, then take the user to the new
			* preset's files — the directory opens where the host has a desktop, and
			* its path appears on the new row where it does not.
			* @returns once the copy settled and the page reflects it.
			*/
			async confirmCopy() {
				const draft = this.store.getSnapshot().copy;
				if (draft === null || draft.saving) return;
				if (draftBlocker(draft, this.store.getSnapshot().rows) !== void 0) return;
				this.patchCopy({
					saving: true,
					error: null
				});
				try {
					const name = draft.name.trim();
					const result = await this.remote.agentPresets.copy(draft.from, draft.id, name === "" ? void 0 : name);
					if (!result.ok) {
						this.patchCopy({
							saving: false,
							error: result.error.message
						});
						return;
					}
					this.set({ copy: null });
					await this.load();
					this.rosterChanged();
					await this.openLocation(draft.id);
				} catch (error) {
					this.patchCopy({
						saving: false,
						error: messageOf(error)
					});
				}
			}
			/**
			* Open one preset's directory on the host desktop, or reveal its path on
			* the row where the deployment has no opener to hand it to.
			* @param id - the preset whose files the user wants.
			* @returns once the host answered and the page reflects it.
			*/
			async openLocation(id) {
				try {
					const result = await this.remote.settings.openAgentPresetDirectory(id);
					if (!result.ok) {
						this.set({ error: result.error.message });
						return;
					}
					if (result.value.opened) return;
					const { path } = result.value;
					this.set({ revealedPaths: {
						...this.store.getSnapshot().revealedPaths,
						[id]: path
					} });
				} catch (error) {
					this.set({ error: messageOf(error) });
				}
			}
			async previewImport(file) {
				this.set({
					error: null,
					import: {
						fileName: file.name,
						data: null,
						id: "",
						name: void 0,
						description: void 0,
						fileCount: 0,
						warnings: [],
						conflict: false,
						reading: true,
						installing: false,
						error: null
					}
				});
				try {
					const data = await file.arrayBuffer();
					const response = await fetch("/api/agent-preset.import", {
						method: "POST",
						headers: { "content-type": "application/vnd.dsh.preset+zip" },
						body: data
					});
					if (!response.ok) {
						const draft = this.store.getSnapshot().import;
						if (draft !== null) this.set({ import: {
							...draft,
							reading: false,
							error: await presetTransferError(response, "Could not import the preset package.")
						} });
						return;
					}
					const preview = await response.json();
					this.set({ import: {
						fileName: file.name,
						data,
						id: preview.agentPreset,
						name: preview.name,
						description: preview.description,
						sourceDshVersion: preview.sourceDshVersion,
						fileCount: preview.fileCount,
						warnings: preview.warnings,
						conflict: preview.conflict,
						reading: false,
						installing: false,
						error: null
					} });
				} catch (error) {
					const draft = this.store.getSnapshot().import;
					if (draft !== null) this.set({ import: {
						...draft,
						reading: false,
						error: messageOf(error)
					} });
				}
			}
			setImportId(id) {
				const draft = this.store.getSnapshot().import;
				if (draft === null) return;
				this.set({ import: {
					...draft,
					id,
					conflict: this.store.getSnapshot().rows.some((row) => row.id === id),
					error: null
				} });
			}
			cancelImport() {
				if (this.store.getSnapshot().import?.installing === true) return;
				this.set({ import: null });
			}
			async confirmImport() {
				const draft = this.store.getSnapshot().import;
				if (draft === null || draft.reading || draft.installing || draft.data === null || !PRESET_ID.test(draft.id) || draft.conflict) return;
				this.set({ import: {
					...draft,
					installing: true,
					error: null
				} });
				try {
					const query = new URLSearchParams({
						agentPreset: draft.id,
						install: "1"
					});
					const response = await fetch(`/api/agent-preset.import?${query}`, {
						method: "POST",
						headers: { "content-type": "application/vnd.dsh.preset+zip" },
						body: draft.data
					});
					if (!response.ok) {
						this.set({ import: {
							...draft,
							installing: false,
							error: await presetTransferError(response, "Could not import the preset package.")
						} });
						return;
					}
					this.set({ import: null });
					await this.load();
					this.rosterChanged();
				} catch (error) {
					this.set({ import: {
						...draft,
						installing: false,
						error: messageOf(error)
					} });
				}
			}
			async exportPreset(id) {
				if (this.store.getSnapshot().exporting !== null) return;
				this.set({
					exporting: id,
					error: null
				});
				try {
					const query = new URLSearchParams({ agentPreset: id });
					const response = await fetch(`/api/agent-preset.export?${query}`);
					if (!response.ok) {
						this.set({ error: await presetTransferError(response, "Could not export the preset.") });
						return;
					}
					const blob = await response.blob();
					const href = URL.createObjectURL(blob);
					const anchor = document.createElement("a");
					anchor.href = href;
					anchor.download = `${id}.dshpreset`;
					anchor.style.display = "none";
					document.body.appendChild(anchor);
					anchor.click();
					anchor.remove();
					URL.revokeObjectURL(href);
				} catch (error) {
					this.set({ error: messageOf(error) });
				} finally {
					this.set({ exporting: null });
				}
			}
			/**
			* Ask for confirmation before deleting one preset.
			* @param id - the preset to delete, or null to dismiss the confirmation.
			*/
			confirmDelete(id) {
				if (this.store.getSnapshot().deleting) return;
				this.set({ pendingDelete: id });
			}
			/**
			* Delete the preset awaiting confirmation, then re-read the roster.
			*
			* A session already composed from it keeps running: its composition was
			* mounted at creation and nothing re-reads the file.
			* @returns once the delete settled and the page reflects it.
			*/
			async remove() {
				const { pendingDelete, deleting } = this.store.getSnapshot();
				if (pendingDelete === null || deleting) return;
				this.set({
					deleting: true,
					error: null
				});
				try {
					const result = await this.remote.agentPresets.deletePreset(pendingDelete);
					if (!result.ok) {
						this.set({
							deleting: false,
							pendingDelete: null,
							error: result.error.message
						});
						return;
					}
					this.set({
						deleting: false,
						pendingDelete: null
					});
					await this.load();
					this.rosterChanged();
				} catch (error) {
					this.set({
						deleting: false,
						pendingDelete: null,
						error: messageOf(error)
					});
				}
			}
			/**
			* Make one preset the default for sessions created later. Running sessions
			* keep the composition they began with, so this never disturbs work.
			* @param id - the preset to make default.
			* @returns once the write settled and the roster was re-read.
			*/
			async makeDefault(id) {
				const failure = await writeDefaultPreset(this.remote, id);
				if (failure !== void 0) {
					this.set({ error: failure });
					return;
				}
				await this.load();
			}
		};
		//#endregion
		//#region \0dsh-css:/private/tmp/claude-501/-Users-alex-Documents-Code-dataelem-dsh-desktop/8cafdb41-dc87-41ba-bba5-9afd99a08420/scratchpad/harness/packages/client/ui-agent-preset/src/client/AgentPresetSection.module.css.mjs
		const css = ".WSmRFG_section{max-width:720px;color:var(--dsw-alias-label-primary);flex-direction:column;gap:12px;display:flex}.WSmRFG_title{margin:0;font-size:18px;font-weight:600}.WSmRFG_intro{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px}.WSmRFG_group{flex-direction:column;gap:10px;display:flex}.WSmRFG_group+.WSmRFG_group{margin-top:20px}.WSmRFG_groupHead{letter-spacing:.06em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;font-weight:600}.WSmRFG_cards{grid-template-columns:repeat(auto-fill,minmax(268px,1fr));grid-auto-rows:1fr;gap:12px;margin:0;padding:0;list-style:none;display:grid}.WSmRFG_card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:12px;flex-direction:column;transition:border-color .16s,background .16s;display:flex}.WSmRFG_card:hover:not(.WSmRFG_cardActive){border-color:var(--dsw-alias-label-dimmed)}.WSmRFG_cardActive{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-label-primary)}.WSmRFG_cardBroken,.WSmRFG_cardBroken:hover{border-color:var(--dsw-alias-state-error-primary)}.WSmRFG_brokenBadge{white-space:nowrap;background:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-bg-layer-3);border-radius:999px;padding:1px 8px;font-size:11px;font-weight:500;line-height:17px}.WSmRFG_brokenTip{z-index:1;background:var(--dsw-alias-label-primary);width:max-content;max-width:100%;color:var(--dsw-alias-bg-layer-3);text-align:left;white-space:pre-line;overflow-wrap:anywhere;opacity:0;pointer-events:none;border-radius:6px;padding:6px 8px;font-size:11px;font-weight:400;line-height:1.5;transition:opacity .12s;position:absolute;top:calc(100% + 6px);left:0}.WSmRFG_brokenBadge:hover .WSmRFG_brokenTip,.WSmRFG_cardMain:focus-visible .WSmRFG_brokenTip{opacity:1}.WSmRFG_cardMain[aria-disabled=true]{cursor:default}.WSmRFG_cardBrokenReason{clip:rect(0 0 0 0);white-space:nowrap;width:1px;height:1px;position:absolute;overflow:hidden}.WSmRFG_cardMain{appearance:none;font:inherit;color:inherit;text-align:left;cursor:pointer;background:0 0;border:0;border-radius:12px 12px 0 0;flex-direction:column;flex:1;gap:8px;padding:14px 16px 12px;display:flex}.WSmRFG_cardMain:disabled{cursor:default}.WSmRFG_cardMain:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}.WSmRFG_cardHead{align-items:center;gap:8px;display:flex;position:relative}.WSmRFG_cardName{font-size:15px;font-weight:600;line-height:1.4}.WSmRFG_badge,.WSmRFG_inUse{white-space:nowrap;border-radius:999px;padding:1px 8px;font-size:11px;font-weight:500;line-height:17px}.WSmRFG_badge{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary)}.WSmRFG_inUse{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3);margin-left:auto}.WSmRFG_cardDesc{color:var(--dsw-alias-label-secondary);-webkit-line-clamp:4;overflow-wrap:anywhere;-webkit-box-orient:vertical;min-height:42px;font-size:13px;line-height:1.55;display:-webkit-box;overflow:hidden}.WSmRFG_cardId{font-family:var(--dsw-font-mono,ui-monospace, SFMono-Regular, Menlo, monospace);color:var(--dsw-alias-label-dimmed);margin-top:auto;font-size:11px}.WSmRFG_cardFoot{border-top:1px solid var(--dsw-alias-border-l2);justify-content:flex-end;gap:2px;padding:6px 10px;display:flex}.WSmRFG_iconButton{appearance:none;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:0;border-radius:7px;align-items:center;padding:6px;display:inline-flex;position:relative}.WSmRFG_iconButton:disabled{opacity:.4;cursor:default}.WSmRFG_iconButton:hover:not(:disabled){background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}.WSmRFG_iconButton:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-1px}.WSmRFG_iconButton:after{content:attr(data-tip);background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3);white-space:nowrap;opacity:0;pointer-events:none;border-radius:6px;padding:3px 8px;font-size:11px;line-height:17px;transition:opacity .12s;position:absolute;bottom:calc(100% + 6px);left:50%;transform:translate(-50%)}.WSmRFG_iconButton:hover:after,.WSmRFG_iconButton:focus-visible:after{opacity:1}.WSmRFG_iconDanger:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary)}.WSmRFG_revealedPath{color:var(--dsw-alias-label-tertiary);align-items:baseline;gap:6px;margin:0;padding:6px 16px 10px;font-size:11px;display:flex}.WSmRFG_revealedPath code{font-family:var(--dsw-font-mono,ui-monospace, SFMono-Regular, Menlo, monospace);color:var(--dsw-alias-label-secondary);user-select:all;overflow-wrap:anywhere}.WSmRFG_revealedPathLabel{white-space:nowrap}.WSmRFG_secondaryButton{color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;background:0 0;border:none;border-radius:7px;padding:5px 8px;font-size:12.5px}.WSmRFG_secondaryButton:hover:not(:disabled){background:var(--dsw-alias-bg-layer-1)}.WSmRFG_secondaryButton:disabled{opacity:.5;cursor:default}.WSmRFG_field{flex-direction:column;gap:6px;display:flex}.WSmRFG_fieldLabel{color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:500}.WSmRFG_input{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);font:inherit;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:10px;padding:9px 12px;font-size:13px}.WSmRFG_input:focus{border-color:var(--dsw-alias-brand-primary);outline:none}.WSmRFG_input::placeholder{color:var(--dsw-alias-label-dimmed)}.WSmRFG_dialog{width:min(560px,100%)}.WSmRFG_dialogFields{flex-direction:column;gap:12px;display:flex}.WSmRFG_viewerCode{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);max-height:min(52vh,480px);color:var(--dsw-alias-label-secondary);font-family:var(--dsw-font-mono,ui-monospace, SFMono-Regular, Menlo, monospace);white-space:pre;tab-size:2;--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);border-radius:10px;margin:0;padding:12px;font-size:12.5px;line-height:1.5;overflow:auto}.WSmRFG_error{color:var(--dsw-alias-state-error-primary);margin:0;font-size:12px}.WSmRFG_deleteDialog{width:min(480px,100%)}.WSmRFG_deleteConfirm:not(:disabled){border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary)}.WSmRFG_deleteConfirm:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger)}.WSmRFG_creatorButton{box-sizing:border-box;border:1px dashed var(--dsw-alias-border-l3);height:44px;font:inherit;color:var(--dsw-alias-label-primary);cursor:pointer;background:0 0;border-radius:12px;justify-content:center;align-self:stretch;align-items:center;gap:6px;font-size:14px;line-height:22px;display:flex}.WSmRFG_creatorButton:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.WSmRFG_creatorButton:disabled{opacity:.4;cursor:default}";
		const tagId = "@deepseek-ai/dsh-client-ui-agent-preset/AgentPresetSection.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-agent-preset";
			tag.dataset.pluginCss = tagId;
			tag.textContent = `${css}.rtSEdW_sectionHead{align-items:center;gap:16px;display:flex}.rtSEdW_sectionActions{flex:none;align-items:center;justify-content:flex-end;gap:8px;margin-left:auto;display:flex}.rtSEdW_hiddenInput{display:none}`;
			document.head.appendChild(tag);
		}
		var AgentPresetSection_module_css_default = {
			"sectionHead": "rtSEdW_sectionHead",
			"sectionActions": "rtSEdW_sectionActions",
			"importButton": "rtSEdW_importButton",
			"hiddenInput": "rtSEdW_hiddenInput",
			"importSecurity": "rtSEdW_importSecurity",
			"importSummary": "rtSEdW_importSummary",
			"importWarnings": "rtSEdW_importWarnings",
			"badge": "WSmRFG_badge",
			"brokenBadge": "WSmRFG_brokenBadge",
			"brokenTip": "WSmRFG_brokenTip",
			"card": "WSmRFG_card",
			"cardActive": "WSmRFG_cardActive",
			"cardBroken": "WSmRFG_cardBroken",
			"cardBrokenReason": "WSmRFG_cardBrokenReason",
			"cardDesc": "WSmRFG_cardDesc",
			"cardFoot": "WSmRFG_cardFoot",
			"cardHead": "WSmRFG_cardHead",
			"cardId": "WSmRFG_cardId",
			"cardMain": "WSmRFG_cardMain",
			"cardName": "WSmRFG_cardName",
			"cards": "WSmRFG_cards",
			"creatorButton": "WSmRFG_creatorButton",
			"deleteConfirm": "WSmRFG_deleteConfirm",
			"deleteDialog": "WSmRFG_deleteDialog",
			"dialog": "WSmRFG_dialog",
			"dialogFields": "WSmRFG_dialogFields",
			"error": "WSmRFG_error",
			"field": "WSmRFG_field",
			"fieldLabel": "WSmRFG_fieldLabel",
			"group": "WSmRFG_group",
			"groupHead": "WSmRFG_groupHead",
			"iconButton": "WSmRFG_iconButton",
			"iconDanger": "WSmRFG_iconDanger",
			"inUse": "WSmRFG_inUse",
			"input": "WSmRFG_input",
			"intro": "WSmRFG_intro",
			"revealedPath": "WSmRFG_revealedPath",
			"revealedPathLabel": "WSmRFG_revealedPathLabel",
			"secondaryButton": "WSmRFG_secondaryButton",
			"section": "WSmRFG_section",
			"title": "WSmRFG_title",
			"viewerCode": "WSmRFG_viewerCode"
		};
		//#endregion
		//#region lib/types/client/AgentPresetSection.js
		/**
		* Agent-presets settings section: the roster as cards, a copy dialog as the
		* only way a preset is created, and a read-only viewer over the shipped
		* compositions.
		*
		* The browser edits no composition text — a shipped preset opens read-only to
		* be READ (it is the known-good composition a copy starts from), and a custom
		* preset is edited in its own files, which is what the location action leads
		* to. Deleting a preset leaves running sessions alone: a composition is
		* mounted once at session creation and nothing re-reads the file.
		*/
		function CopyDialog({ state, t, actions }) {
			const draft = state.copy;
			const blocker = draft === null ? void 0 : draftBlocker(draft, state.rows);
			const message = draft === null ? null : draft.error ?? (blocker === void 0 ? null : t(blocker));
			const source = draft === null ? void 0 : state.rows.find((row) => row.id === draft.from);
			const sourceTitle = source === void 0 ? draft?.fromTitle : presetDisplayText(source, t).name;
			return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: draft !== null,
				onClose: () => {
					actions.cancelCopy();
				},
				title: draft === null ? t("copyTitle") : `${t("copyTitle")} · ${t("copyOf")} ${sourceTitle}`,
				closeLabel: t("close"),
				description: t("copyIntro"),
				className: AgentPresetSection_module_css_default.dialog,
				footer: (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					disabled: draft?.saving === true,
					onClick: () => {
						actions.cancelCopy();
					},
					children: t("cancel")
				}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					disabled: draft === null || draft.saving || blocker !== void 0,
					onClick: () => {
						actions.confirmCopy();
					},
					children: draft?.saving === true ? t("creating") : t("create")
				})] }),
				children: draft === null ? null : (0, react_jsx_runtime.jsxs)("div", {
					className: AgentPresetSection_module_css_default.dialogFields,
					children: [
						(0, react_jsx_runtime.jsxs)("label", {
							className: AgentPresetSection_module_css_default.field,
							children: [(0, react_jsx_runtime.jsx)("span", {
								className: AgentPresetSection_module_css_default.fieldLabel,
								children: t("presetId")
							}), (0, react_jsx_runtime.jsx)("input", {
								className: AgentPresetSection_module_css_default.input,
								value: draft.id,
								autoFocus: true,
								spellCheck: false,
								placeholder: t("presetIdPlaceholder"),
								onChange: (event) => {
									actions.setCopyId(event.target.value);
								}
							})]
						}),
						(0, react_jsx_runtime.jsxs)("label", {
							className: AgentPresetSection_module_css_default.field,
							children: [(0, react_jsx_runtime.jsx)("span", {
								className: AgentPresetSection_module_css_default.fieldLabel,
								children: t("displayName")
							}), (0, react_jsx_runtime.jsx)("input", {
								className: AgentPresetSection_module_css_default.input,
								value: draft.name,
								spellCheck: false,
								placeholder: t("displayNamePlaceholder"),
								onChange: (event) => {
									actions.setCopyName(event.target.value);
								}
							})]
						}),
						message === null ? null : (0, react_jsx_runtime.jsx)("p", {
							className: AgentPresetSection_module_css_default.error,
							role: "alert",
							children: message
						})
					]
				})
			});
		}
		function ImportDialog({ state, t, actions }) {
			const draft = state.import;
			const blocker = draft === null || draft.reading ? void 0 : draft.id === "" ? "idRequired" : !PRESET_ID.test(draft.id) ? "idInvalid" : draft.conflict ? "idTaken" : void 0;
			const warningText = {
				"absolute-paths": "importWarningAbsolutePaths",
				"possible-secrets": "importWarningPossibleSecrets",
				"version-mismatch": "importWarningVersionMismatch"
			};
			return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: draft !== null,
				onClose: () => {
					actions.cancelImport();
				},
				title: t("importTitle"),
				closeLabel: t("close"),
				description: t("importIntro"),
				className: AgentPresetSection_module_css_default.dialog,
				footer: (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					disabled: draft?.installing === true,
					onClick: () => {
						actions.cancelImport();
					},
					children: t("cancel")
				}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					disabled: draft === null || draft.reading || draft.installing || draft.data === null || blocker !== void 0,
					onClick: () => {
						actions.confirmImport();
					},
					children: draft?.installing === true ? t("importing") : t("importConfirm")
				})] }),
				children: draft === null ? null : draft.reading ? (0, react_jsx_runtime.jsx)("p", { children: t("readingPackage") }) : (0, react_jsx_runtime.jsxs)("div", {
					className: AgentPresetSection_module_css_default.dialogFields,
					children: [
						(0, react_jsx_runtime.jsx)("p", {
							className: AgentPresetSection_module_css_default.importSecurity,
							children: t("importSecurity")
						}),
						(0, react_jsx_runtime.jsxs)("dl", {
							className: AgentPresetSection_module_css_default.importSummary,
							children: [
								(0, react_jsx_runtime.jsx)("dt", { children: t("packageFile") }),
								(0, react_jsx_runtime.jsx)("dd", { children: draft.fileName }),
								(0, react_jsx_runtime.jsx)("dt", { children: t("packageContents") }),
								(0, react_jsx_runtime.jsx)("dd", { children: t("packageContentsValue", { count: draft.fileCount }) }),
								draft.sourceDshVersion === void 0 ? null : (0, react_jsx_runtime.jsx)("dt", { children: "DSH" }),
								draft.sourceDshVersion === void 0 ? null : (0, react_jsx_runtime.jsx)("dd", { children: t("packageVersion", { version: draft.sourceDshVersion }) })
							]
						}),
						(0, react_jsx_runtime.jsxs)("label", {
							className: AgentPresetSection_module_css_default.field,
							children: [(0, react_jsx_runtime.jsx)("span", {
								className: AgentPresetSection_module_css_default.fieldLabel,
								children: t("presetId")
							}), (0, react_jsx_runtime.jsx)("input", {
								className: AgentPresetSection_module_css_default.input,
								value: draft.id,
								autoFocus: true,
								spellCheck: false,
								placeholder: t("presetIdPlaceholder"),
								onChange: (event) => {
									actions.setImportId(event.target.value);
								}
							})]
						}),
						draft.warnings.length === 0 ? null : (0, react_jsx_runtime.jsx)("ul", {
							className: AgentPresetSection_module_css_default.importWarnings,
							children: draft.warnings.map((warning) => (0, react_jsx_runtime.jsx)("li", { children: t(warningText[warning] ?? warning) }, warning))
						}),
						draft.error === null && blocker === void 0 ? null : (0, react_jsx_runtime.jsx)("p", {
							className: AgentPresetSection_module_css_default.error,
							role: "alert",
							children: draft.error ?? t(blocker)
						})
					]
				})
			});
		}
		/**
		* Render one card's description, clamped by CSS and offered in full on hover.
		* The tooltip is attached only while the text is actually cut off, so a short
		* description does not answer a hover with a bubble repeating the card.
		* @param props.text - the description as rendered, already localized.
		* @returns the description element, tooltip-anchored while it overflows.
		*/
		function CardDescription({ text }) {
			const ref = (0, react.useRef)(null);
			const [truncated, setTruncated] = (0, react.useState)(false);
			(0, react.useLayoutEffect)(() => {
				const el = ref.current;
				/* v8 ignore next -- the ref is attached before layout effects run. */
				if (el === null) return;
				const measure = () => {
					setTruncated(el.scrollHeight > el.clientHeight);
				};
				measure();
				if (typeof ResizeObserver === "undefined") return;
				const observer = new ResizeObserver(measure);
				observer.observe(el);
				return () => {
					observer.disconnect();
				};
			}, [text]);
			return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
				label: text,
				side: "bottom",
				delayMs: 400,
				disabled: !truncated,
				maxWidth: 360,
				children: (0, react_jsx_runtime.jsx)("span", {
					ref,
					className: AgentPresetSection_module_css_default.cardDesc,
					title: "",
					children: text
				})
			});
		}
		/**
		* Render the Agent presets section content column.
		* @param props - composed slot props.
		* @returns the section, or null when the deployment composes no presets.
		*/
		function AgentPresetSection(props) {
			const { useAgentPresetSection, t, load } = props;
			const state = useAgentPresetSection((snapshot) => snapshot);
			const importInput = (0, react.useRef)(null);
			const viewedId = state.view?.id;
			const viewedRow = viewedId === void 0 ? void 0 : state.rows.find((row) => row.id === viewedId);
			const viewedTitle = state.view === null ? "" : viewedRow === void 0 ? state.view.title : presetDisplayText(viewedRow, t).name;
			(0, react.useEffect)(() => {
				load();
			}, [load]);
			if (state.status === "unavailable") return null;
			if (state.status === "error") {
				/* v8 ignore next -- an error status always carries text; the fallback satisfies the nullable type */
				const detail = state.error ?? "";
				return (0, react_jsx_runtime.jsxs)("div", {
					className: AgentPresetSection_module_css_default.section,
					children: [(0, react_jsx_runtime.jsx)("p", {
						className: AgentPresetSection_module_css_default.error,
						role: "alert",
						children: `${t("error")} ${detail}`
					}), (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: AgentPresetSection_module_css_default.secondaryButton,
						onClick: () => {
							load();
						},
						children: t("retry")
					})]
				});
			}
			const creatorButton = props.startCreatorDraft !== void 0 && state.rows.some((row) => row.id === "cordis") ? (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: AgentPresetSection_module_css_default.creatorButton,
				disabled: !state.authorable,
				title: state.authorable ? void 0 : t("duplicateUnavailable"),
				onClick: () => {
					props.startCreatorDraft?.();
					props.close();
				},
				children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, { size: 14 }), t("creatorDraft")]
			}) : null;
			return (0, react_jsx_runtime.jsxs)("div", {
				className: AgentPresetSection_module_css_default.section,
				children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: AgentPresetSection_module_css_default.sectionHead,
						children: [(0, react_jsx_runtime.jsx)("h2", {
							className: AgentPresetSection_module_css_default.title,
							children: t("nav")
						}), (0, react_jsx_runtime.jsxs)("div", {
							className: AgentPresetSection_module_css_default.sectionActions,
							children: [(0, react_jsx_runtime.jsx)("input", {
							ref: importInput,
							type: "file",
							accept: ".dshpreset,application/vnd.dsh.preset+zip,application/zip",
							className: AgentPresetSection_module_css_default.hiddenInput,
							onChange: (event) => {
								const file = event.target.files?.[0];
								event.target.value = "";
								if (file !== void 0) props.previewImport(file);
							}
						}), (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							className: AgentPresetSection_module_css_default.importButton,
							disabled: !state.authorable,
							title: state.authorable ? void 0 : t("duplicateUnavailable"),
							onClick: () => {
								importInput.current?.click();
							},
							children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconArchiveOutline20, { size: 16 }), t("importPreset")]
						}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							onClick: () => {
								window.open("https://www.dshdesktop.com/preset/", "_blank", "noopener,noreferrer");
							},
							children: t("awesomePreset")
						})]
						})]
					}),
					(0, react_jsx_runtime.jsx)("p", {
						className: AgentPresetSection_module_css_default.intro,
						children: t("sectionIntro")
					}),
					state.error === null ? null : (0, react_jsx_runtime.jsx)("p", {
						className: AgentPresetSection_module_css_default.error,
						role: "alert",
						children: state.error
					}),
					[["system", t("builtInGroup")], ["user", t("customGroup")]].map(([trust, heading]) => {
						const group = state.rows.filter((row) => row.trust === trust).map((row) => ({
							row,
							text: presetDisplayText(row, t)
						}));
						const tail = trust === "user" ? creatorButton : null;
						if (group.length === 0 && tail === null) return null;
						return (0, react_jsx_runtime.jsxs)("section", {
							className: AgentPresetSection_module_css_default.group,
							children: [
								(0, react_jsx_runtime.jsx)("h3", {
									className: AgentPresetSection_module_css_default.groupHead,
									children: heading
								}),
								group.length === 0 ? null : (0, react_jsx_runtime.jsx)("ul", {
									className: AgentPresetSection_module_css_default.cards,
									children: group.map(({ row, text }) => (0, react_jsx_runtime.jsxs)("li", {
										className: row.broken !== void 0 ? `${AgentPresetSection_module_css_default.card} ${AgentPresetSection_module_css_default.cardBroken}` : row.isDefault ? `${AgentPresetSection_module_css_default.card} ${AgentPresetSection_module_css_default.cardActive}` : AgentPresetSection_module_css_default.card,
										children: [
											(0, react_jsx_runtime.jsxs)("button", {
												type: "button",
												className: AgentPresetSection_module_css_default.cardMain,
												"aria-pressed": row.isDefault,
												disabled: row.isDefault,
												"aria-disabled": row.broken !== void 0,
												"aria-label": `${row.broken !== void 0 ? t("brokenBadge") : row.isDefault ? t("inUse") : t("setDefault")}: ${text.name}`,
												title: row.broken !== void 0 ? t("brokenBadge") : row.isDefault ? t("inUse") : t("setDefault"),
												onClick: () => {
													if (row.broken !== void 0) return;
													props.makeDefault(row.id);
												},
												children: [
													(0, react_jsx_runtime.jsxs)("span", {
														className: AgentPresetSection_module_css_default.cardHead,
														children: [
															(0, react_jsx_runtime.jsx)("span", {
																className: AgentPresetSection_module_css_default.cardName,
																children: text.name
															}),
															row.broken !== void 0 ? (0, react_jsx_runtime.jsxs)("span", {
																className: AgentPresetSection_module_css_default.brokenBadge,
																children: [t("brokenBadge"), (0, react_jsx_runtime.jsx)("span", {
																	className: AgentPresetSection_module_css_default.brokenTip,
																	"aria-hidden": "true",
																	children: row.broken
																})]
															}) : null,
															(0, react_jsx_runtime.jsx)("span", {
																className: AgentPresetSection_module_css_default.badge,
																children: row.trust === "user" ? t("userTrust") : t("builtIn")
															}),
															row.isDefault ? (0, react_jsx_runtime.jsx)("span", {
																className: AgentPresetSection_module_css_default.inUse,
																children: t("inUse")
															}) : null
														]
													}),
													(0, react_jsx_runtime.jsx)(CardDescription, { text: text.description ?? t("noDescription") }),
													row.broken === void 0 ? null : (0, react_jsx_runtime.jsx)("span", {
														className: AgentPresetSection_module_css_default.cardBrokenReason,
														role: "alert",
														children: row.broken
													}),
													(0, react_jsx_runtime.jsx)("code", {
														className: AgentPresetSection_module_css_default.cardId,
														children: row.id
													})
												]
											}),
											(0, react_jsx_runtime.jsxs)("div", {
												className: AgentPresetSection_module_css_default.cardFoot,
												children: [
													row.trust === "system" ? row.broken === void 0 ? (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														className: AgentPresetSection_module_css_default.iconButton,
														"data-tip": t("view"),
														"aria-label": `${t("view")}: ${text.name}`,
														onClick: () => {
															props.view(row.id);
														},
														children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBrowseOutline16, {})
													}) : null : (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														className: AgentPresetSection_module_css_default.iconButton,
														"data-tip": state.hasDocument ? t("openLocation") : t("showLocation"),
														"aria-label": `${state.hasDocument ? t("openLocation") : t("showLocation")}: ${text.name}`,
														onClick: () => {
															props.openLocation(row.id);
														},
														children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpenOutline16, {})
													}),
											(0, react_jsx_runtime.jsx)("button", {
														type: "button",
														className: AgentPresetSection_module_css_default.iconButton,
														disabled: !state.authorable || row.broken !== void 0,
														"data-tip": row.broken !== void 0 ? t("brokenNoCopy") : state.authorable ? t("duplicate") : t("duplicateUnavailable"),
														"aria-label": `${t("duplicate")}: ${text.name}`,
														onClick: () => {
															props.beginCopy(row.id);
														},
												children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCopyOutline16, {})
											}),
											row.trust === "user" ? (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: AgentPresetSection_module_css_default.iconButton,
												disabled: state.exporting !== null || row.broken !== void 0,
												"data-tip": state.exporting === row.id ? t("exporting") : t("exportPreset"),
												"aria-label": `${t("exportPreset")}: ${text.name}`,
												onClick: () => {
													props.exportPreset(row.id);
												},
												children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDownloadOutline16, {})
											}) : null,
											row.trust === "user" ? (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														className: `${AgentPresetSection_module_css_default.iconButton} ${AgentPresetSection_module_css_default.iconDanger}`,
														"data-tip": t("delete"),
														"aria-label": `${t("delete")}: ${text.name}`,
														onClick: () => {
															props.confirmDelete(row.id);
														},
														children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, {})
													}) : null
												]
											}),
											state.revealedPaths[row.id] === void 0 ? null : (0, react_jsx_runtime.jsxs)("p", {
												className: AgentPresetSection_module_css_default.revealedPath,
												children: [(0, react_jsx_runtime.jsx)("span", {
													className: AgentPresetSection_module_css_default.revealedPathLabel,
													children: t("revealedPathLabel")
												}), (0, react_jsx_runtime.jsx)("code", { children: state.revealedPaths[row.id] })]
											})
										]
									}, row.id))
								}),
								tail
							]
						}, trust);
					}),
					(0, react_jsx_runtime.jsx)(CopyDialog, {
						state,
						t,
					actions: {
							cancelCopy: props.cancelCopy,
							confirmCopy: props.confirmCopy,
							setCopyId: props.setCopyId,
							setCopyName: props.setCopyName
					}
				}),
				(0, react_jsx_runtime.jsx)(ImportDialog, {
					state,
					t,
					actions: {
						cancelImport: props.cancelImport,
						confirmImport: props.confirmImport,
						setImportId: props.setImportId
					}
				}),
					(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: state.view !== null,
						onClose: () => {
							props.closeView();
						},
						title: state.view === null ? "" : `${t("view")} · ${viewedTitle}`,
						closeLabel: t("close"),
						description: t("composition"),
						className: AgentPresetSection_module_css_default.dialog,
						footer: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							autoFocus: true,
							onClick: () => {
								props.closeView();
							},
							children: t("close")
						}),
						children: state.view === null ? null : (0, react_jsx_runtime.jsx)("pre", {
							className: AgentPresetSection_module_css_default.viewerCode,
							children: state.view.content
						})
					}),
					(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: state.pendingDelete !== null,
						onClose: () => {
							props.confirmDelete(null);
						},
						title: t("deleteTitle"),
						closeLabel: t("close"),
						description: t("deleteDescription"),
						className: AgentPresetSection_module_css_default.deleteDialog,
						footer: (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							autoFocus: true,
							disabled: state.deleting,
							onClick: () => {
								props.confirmDelete(null);
							},
							children: t("cancel")
						}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							className: AgentPresetSection_module_css_default.deleteConfirm,
							disabled: state.deleting,
							onClick: () => {
								props.remove();
							},
							children: state.deleting ? t("deleting") : t("deleteConfirm")
						})] })
					})
				]
			});
		}
		//#endregion
		//#region lib/types/client/seat-store.js
		/**
		* Hero-chip controller: which preset the NEXT session gets.
		*
		* The new-session screen has no session, so a pick is staged rather than
		* applied. It reaches a session when one becomes current and is still blank —
		* whether the workspace connect created it or reused an existing blank one,
		* which is why staging cannot simply ride along on `sessions.create`.
		*
		* The stage is forgotten once applied: the next new session starts from the
		* deployment default again, matching the workspace picker beside it.
		*/
		const INITIAL = {
			options: [],
			current: "",
			error: null,
			busy: false,
			introduce: false
		};
		/** Stages the next session's preset and applies it when one appears. */
		var AgentPresetSeatController = class {
			remote;
			currentSession;
			/** Chip snapshot the renderer subscribes to. */
			store = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(INITIAL);
			/**
			* The deployment default, so a consumed stage can fall back to it without
			* re-reading the roster.
			*/
			fallback = "";
			/** Set while a pick is waiting for a session; cleared once applied. */
			staged;
			constructor(remote, currentSession) {
				this.remote = remote;
				this.currentSession = currentSession;
			}
			set(patch) {
				this.store.set({
					...this.store.getSnapshot(),
					...patch
				});
			}
			/**
			* Read the roster and open the chip on the deployment default.
			* @returns once the snapshot reflects the host.
			*/
			async load() {
				const roster = await readRoster(this.remote);
				if (!roster.ok) {
					this.set({ error: roster.error });
					return;
				}
				const { presets } = roster.value;
				this.fallback = presets.find((preset) => preset.isDefault)?.id ?? presets[0]?.id ?? "";
				const session = this.currentSession();
				this.set({
					options: presetOptions(presets),
					current: this.staged ?? (session === void 0 ? this.fallback : presetOf(session) ?? ""),
					error: null
				});
			}
			/**
			* Stage one preset for the next session, applying it immediately when a
			* blank session is already current.
			*
			* The refusal is returned as well as stored, because the two readers need
			* different things from it: the chip's own label carries the standing state,
			* while the caller that made this pick is the one that has to say why the
			* label came back — and only it knows the pick was a person's, not the
			* applier catching up with a session that just became current.
			* @param id - the preset to stage.
			* @returns the refusal text, or undefined once the pick settled.
			*/
			async select(id) {
				if (this.store.getSnapshot().busy) return void 0;
				this.stage(id);
				await this.apply();
				return this.store.getSnapshot().error ?? void 0;
			}
			/**
			* Stage a pick WITHOUT the immediate apply, for a flow that starts the
			* receiving session after the pick (the settings section's creator entry).
			* `select()`'s immediate apply would meet the still-current running session
			* and drop the stage as unservable; staging alone leaves it for the
			* list-change applier, which fires when the started session becomes
			* current.
			* @param id - the preset to stage.
			* @param introduce - true when the stage came from another screen and the
			* chip should announce itself on the session it lands on.
			*/
			stage(id, introduce = false) {
				this.staged = id;
				this.set({
					current: id,
					error: null,
					introduce
				});
			}
			/** Acknowledge the introduction cue once the chip has played it. */
			introduced() {
				if (!this.store.getSnapshot().introduce) return;
				this.set({ introduce: false });
			}
			/**
			* Hand the staged choice to the current session, if there is one to take it.
			*
			* Called both by `select()` and by whoever observes the current session
			* changing, because the session may appear either before or after the pick.
			* @returns once the switch settled, or immediately when there is nothing to do.
			*/
			async apply() {
				const staged = this.staged;
				const session = this.currentSession();
				if (staged === void 0) {
					const current = session === void 0 ? this.fallback : presetOf(session) ?? "";
					if (current !== this.store.getSnapshot().current) this.set({ current });
					return;
				}
				if (session === void 0) return;
				if (!session.blank || presetOf(session) === staged) {
					this.staged = void 0;
					return;
				}
				this.set({
					busy: true,
					error: null
				});
				try {
					const result = await this.remote.agentPresets.select(session.id, staged);
					this.staged = void 0;
					if (!result.ok) {
						const { error } = result;
						this.set({
							busy: false,
							error: "reason" in error.details && typeof error.details.reason === "string" ? error.details.reason : error.message,
							current: presetOf(session) ?? ""
						});
						return;
					}
					this.set({
						busy: false,
						current: result.value
					});
				} catch (error) {
					this.staged = void 0;
					this.set({
						busy: false,
						error: messageOf(error),
						current: presetOf(session) ?? ""
					});
				}
			}
		};
		function presetOf(session) {
			const value = session?.projectionValues?.agentPreset;
			return typeof value === "string" ? value : void 0;
		}
		//#endregion
		//#region lib/types/client/index.js
		/**
		* Agent-preset surface plugin, browser half — four surfaces over one roster:
		* a General-settings row for the default preset, a chip on the new-session
		* screen for the session about to start, a read-only label in the session
		* header, and a settings section that manages the roster (copy, delete,
		* default, and the way into a preset's own files).
		*
		* A running session keeps the composition it began with (the host refuses to
		* adopt an existing session under a different preset). That is what splits
		* the choice from the display: the General row and the hero chip are both
		* before-the-fact, while the header only reports what a session already runs.
		*/
		/** Required services (cordis fiber inject). */
		const inject = [
			"slots",
			"locale",
			"remote",
			"remote.agentPresets",
			"remote.settings",
			"settingsScope"
		];
		/**
		* Mount the General-settings row.
		* @param ctx - the browser plugin context.
		*/
		function apply(ctx) {
			const controller = new AgentPresetSettingsController({ settings: ctx.remote.settings }, ctx.remote, ctx.settingsScope.describe());
			const rosterReaders = /* @__PURE__ */ new Set();
			const section = new AgentPresetSectionController(ctx.remote, () => {
				controller.load();
				for (const read of rosterReaders) read();
			});
			ctx.effect(() => ctx.locale.register("settings.agentPreset", {
				zh,
				en
			}), "ui-agent-preset: settings row dictionaries");
			const injected = () => ({
				hooks: { agentPreset: controller.store },
				load: () => controller.load(),
				select: (id) => controller.select(id)
			});
			ctx.effect(() => {
				const refresh = () => {
					controller.load();
					if (section.store.getSnapshot().status !== "idle") section.load();
				};
				const disposers = [ctx.remote.$on("settings/document-updated", (ns) => {
					if (ns !== "agent-presets") return;
					refresh();
				}), ctx.on("connection/reset", () => {
					refresh();
				})];
				return () => {
					for (const dispose of disposers) dispose();
				};
			}, "ui-agent-preset: settings refresh");
			let creatorDraft;
			ctx.inject([
				"slots",
				"conversation",
				"sessions",
				"uiWorkspace"
			], (scope) => {
				const seat = new AgentPresetSeatController(scope.remote, () => {
					const state = scope.sessions.list.getSnapshot();
					return state.current === void 0 ? void 0 : state.byId[state.current];
				});
				const seatInjected = () => ({
					hooks: { agentPresetSeat: seat.store },
					load: () => seat.load(),
					select: (id) => seat.select(id),
					introduced: () => {
						seat.introduced();
					}
				});
				const labelInjected = () => ({
					hooks: { agentPresets: controller.store },
					load: () => controller.load()
				});
				scope.effect(() => {
					const stop = scope.sessions.list.subscribe(() => {
						seat.apply();
					});
					const settingsMoved = scope.remote.$on("settings/document-updated", (ns) => {
						if (ns !== "agent-presets") return;
						seat.load();
					});
					const readRoster = () => {
						seat.load();
					};
					rosterReaders.add(readRoster);
					creatorDraft = () => {
						seat.stage("cordis", true);
						scope.uiWorkspace.startSession();
					};
					const chip = scope.slots.register({
						name: "conversation.hero.agentPreset",
						locale: "settings.agentPreset",
						inject: seatInjected
					}, AgentPresetSeat);
					const label = scope.slots.register({
						name: "conversation.session.header.actions",
						id: "agent-preset",
						order: -10,
						locale: "settings.agentPreset",
						inject: labelInjected
					}, AgentPresetLabel);
					return () => {
						stop();
						settingsMoved();
						rosterReaders.delete(readRoster);
						creatorDraft = void 0;
						chip();
						label();
					};
				}, "ui-agent-preset: new-session chip and header label");
			});
			const sectionInjected = () => ({
				hooks: { agentPresetSection: section.store },
				load: () => section.load(),
				view: (id) => section.view(id),
				closeView: () => {
					section.closeView();
				},
				beginCopy: (from) => {
					section.beginCopy(from);
				},
				cancelCopy: () => {
					section.cancelCopy();
				},
				setCopyId: (id) => {
					section.setCopyId(id);
				},
				setCopyName: (name) => {
					section.setCopyName(name);
				},
				confirmCopy: () => section.confirmCopy(),
				openLocation: (id) => section.openLocation(id),
				previewImport: (file) => section.previewImport(file),
				setImportId: (id) => {
					section.setImportId(id);
				},
				cancelImport: () => {
					section.cancelImport();
				},
				confirmImport: () => section.confirmImport(),
				exportPreset: (id) => section.exportPreset(id),
				...creatorDraft === void 0 ? {} : { startCreatorDraft: creatorDraft },
				confirmDelete: (id) => {
					section.confirmDelete(id);
				},
				remove: () => section.remove(),
				makeDefault: (id) => section.makeDefault(id)
			});
			ctx.slots.inject("settings.general.item", () => ctx.slots.register({
				name: "settings.general.item",
				id: "agent-preset",
				order: -25,
				locale: "settings.agentPreset",
				inject: injected
			}, AgentPresetRow));
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "agent-presets",
				order: 20,
				label: () => ctx.locale.bind("settings.agentPreset")("nav"),
				locale: "settings.agentPreset",
				inject: sectionInjected
			}, AgentPresetSection));
		}
		//#endregion
		exports.AGENT_PRESET_SETTINGS_NS = AGENT_PRESET_SETTINGS_NS;
		exports.apply = apply;
		exports.draftBlocker = draftBlocker;
		exports.inject = inject;
		exports.writeDefaultPreset = writeDefaultPreset;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map