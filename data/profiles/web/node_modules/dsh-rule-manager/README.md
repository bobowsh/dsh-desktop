# dsh-rule-manager

[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)

统一管理 DSH 规则的插件：**全局规则 + 项目规则编辑 + LLM 自动拆分**，三个功能收进设置面板的一个「规则管理」入口。

合并自 `dsh-global-rules` 与 `dsh-rule-splitter`，所有 HTTP 路由与原插件保持一致，升级无破坏。

## 功能 / Features

- **全局规则**：编辑 `~/.dsh/AGENTS.md`，保存实时生效（新会话立即生效；当前会话在下次文件操作后感知）
- **项目规则**：选择工作区，编辑其根目录/子目录的任意 `AGENTS.md`
- **自动拆分**：粘贴项目规则，LLM 自动拆分为「精简总纲 + 按需加载的 `.dsh/skills/<主题>/SKILL.md`」；支持直接覆盖 / 合并保留原规则两种模式，覆盖前自动备份，先预览后写盘

零构建：Client 端为手写 `__ModuleLoader__` bundle，Host 端为纯 Node ESM。

## 安装 / Install

```sh
dsh plugin --profile web add dsh-rule-manager
```

> 升级自旧插件：先卸载 `dsh-global-rules` 与 `dsh-rule-splitter`，再安装本插件，避免两个「规则」设置入口并存。

重启 `dsh web`，打开 **设置 → 规则管理**。

## 使用 / Usage

1. 打开 设置 → 规则管理
2. 三个 tab 按需使用：全局规则（写 `~/.dsh/AGENTS.md`）、项目规则（选工作区 + 规则文件编辑）、自动拆分（粘贴规则 → 选模型 → 预览 → 确认生成）

## 工作原理 / How it works

- **Host**（`lib/index.js`）：注册 7 个 HTTP 路由
  - `GET/POST /global-rules` —— 读写 `~/.dsh/AGENTS.md`（同源校验 + 256 KiB 上限）
  - `GET /rule-splitter/workspaces` —— 工作区列表
  - `GET /rule-splitter/models` —— 模型目录
  - `GET/POST /rule-splitter/rules` —— 项目规则读写
  - `GET /rule-splitter/rule-files` —— 规则文件列表
  - `POST /rule-splitter/split` —— LLM 拆分（预览，不写盘）
  - `POST /rule-splitter/apply` —— 确认写盘（覆盖前备份）
- **Client**（`lib/client.js`）：手写 `window.__ModuleLoader__.load` bundle，注册 `settings.section` 的「规则管理」页面（三个 tab）
- **生效机制**：依赖 DSH 内置 `dsh-agent-instructions` 的动态检测，无需插件做热重载

## 目录结构 / Structure

```
dsh-rule-manager/
├── cordis.patch.yml   # bundle patch：插入 rule-manager 层
├── lib/
│   ├── index.js       # Host：HTTP 路由（Node ESM）
│   └── client.js      # Client：设置页 UI（__ModuleLoader__ bundle）
├── test-smoke.mjs     # Host 冒烟测试（node test-smoke.mjs）
└── package.json
```

## 故障排查 / Troubleshooting

- **设置里看不到「规则管理」入口**：重启 `dsh web` 后刷新页面；确认插件已加入 profile 的 `dsh.profile.bundles`。
- **升级自旧插件后出现多个规则入口**：卸载 `dsh-global-rules` / `dsh-rule-splitter`（本插件已合并两者，路径完全兼容）。
- **「自动拆分」提示模型调用失败**：在拆分 tab 重新选择 provider / model；规则内容过长时先精简再试（单次上限 256 KiB，超时 180 秒）。
- **保存后当前会话未感知新规则**：属预期行为——新规则在新会话立即生效，当前会话在下次文件操作后感知（由 `dsh-agent-instructions` 动态检测）。

## 开发 / Development

```sh
node test-smoke.mjs   # 运行 host 冒烟测试（mock 服务，无需真实 DSH 环境）
```

## License

[MIT](LICENSE)
