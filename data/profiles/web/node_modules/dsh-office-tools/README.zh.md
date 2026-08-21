# dsh-office-tools

为 DeepSeek Harness 提供 7 个模型可调用的 Office 文件工具，全部运行在 host 半。

[![ci](https://github.com/kw78/dsh-office-tools/actions/workflows/ci.yml/badge.svg)](https://github.com/kw78/dsh-office-tools/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE) [![已收录于 awesome-dsh-plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)

> 安装：`dsh plugin --profile web add github:kw78/dsh-office-tools`

| 工具 | 作用 | 依赖 |
|---|---|---|
| `word_create` | 创建 `.docx`（标题、段落、项目符号、一个表格） | `docx` |
| `word_read` | 提取 `.docx` 纯文本 | `mammoth` |
| `excel_create` | 创建多 sheet 的 `.xlsx`（标量单元格网格） | SheetJS (`xlsx`) |
| `excel_read` | 读取一个或全部 sheet，返回标量行 | SheetJS |
| `excel_update` | 就地替换/新建整张 sheet，或按 A1 地址写单元格 | SheetJS |
| `ppt_create` | 创建 16:9 `.pptx`（标题页、标题、段落、项目符号、备注、PNG/JPG/GIF 图片） | `pptxgenjs` |
| `ppt_read` | 按页提取 `.pptx` 段落文本、演讲者备注与图片数量 | `jszip` |

## 框架接入方式

插件遵循 DSH 标准 host 插件契约：

- 模块导出 `name` / `inject` / `apply`；本插件 `inject = ['tools']`，唯一运行时依赖是 `ctx.tools`（`@deepseek-ai/dsh-tools`）。
- `apply(ctx)` 中用 `ctx.effect(() => ...)` 包裹 `ctx.tools.register(defineTool({...}))`，Cordis fiber 卸载时自动 dispose。
- `defineTool` 统一声明 `parameters`（模型可见 JSON Schema）、`output.schema`（强制校验的规范 JSON 值）与 `output.render`（模型看到的文本投影）。
- 每个 `execute(args, exec)` 从 `exec.agent.session.header.cwd` 取会话工作目录；相对路径按该目录解析，绝对路径只接受仍位于工作目录内的路径，并对最近存在的祖先做 `realpath` 校验防止符号链接逃逸。
- 图片文件必须位于会话工作目录内（`.png/.jpg/.jpeg/.gif`，单张上限 20 MiB）；可显式指定英寸坐标 `x/y/w/h`，省略时自动放在文本下方。
- 写文件采用同目录临时文件 + `rename` 原子落盘；`overwrite` 默认 `false`，防止误覆盖。

## 构建

```bash
pnpm install
pnpm run check   # typecheck + tests + build
```

构建产物：`lib/index.js`（host ESM，Office 依赖内联，`@deepseek-ai/*`/`cordis` 保持 external）与 `lib/types/**/*.d.ts`。

## 安装

```bash
dsh plugin --profile web add github:kw78/dsh-office-tools
# 或本地目录：
dsh plugin --profile web add /path/to/dsh-office-tools
```

安装后重启 DSH 服务。模型下一次组装提示词时即可看到 7 个工具。

## 社区索引

- awesome-dsh-plugin / dsh-market 的登记块见 [docs/hub-registration.md](docs/hub-registration.md)。
- 仓库 topics 建议：`dsh`、`dsh-plugin`、`deepseek-harness`、`office`。

## 安全边界

- 所有读写都限制在发起调用的 agent 的会话工作目录内。
- 读取文件上限 50 MiB，文本/单元格结果有上限并标记 `truncated`。
- 创建/更新有行数、单元格数上限，且默认不覆盖已有文件。
- 不调用 LibreOffice / PowerPoint / Word 等外部进程，所有格式均通过纯 JS 库生成/解析。
