# dsh-office-tools

Seven model-facing Office file tools for DeepSeek Harness, running entirely in the plugin host half.

[![ci](https://github.com/kw78/dsh-office-tools/actions/workflows/ci.yml/badge.svg)](https://github.com/kw78/dsh-office-tools/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE) [![Listed on awesome-dsh-plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)

> Install: `dsh plugin --profile web add github:kw78/dsh-office-tools`

| Tool | Purpose | Library |
|---|---|---|
| `word_create` | Create `.docx` (title, paragraphs, bullets, one table) | `docx` |
| `word_read` | Extract plain text from `.docx` | `mammoth` |
| `excel_create` | Create a multi-sheet `.xlsx` from scalar cell grids | SheetJS (`xlsx`) |
| `excel_read` | Read one or all sheets as scalar rows | SheetJS |
| `excel_update` | Replace/create whole sheets, or write cells by A1 address | SheetJS |
| `ppt_create` | Create a 16:9 `.pptx` (title slide, titles, paragraphs, bullets, notes, PNG/JPG/GIF images) | `pptxgenjs` |
| `ppt_read` | Extract per-slide paragraph text, speaker notes, and image counts | `jszip` |

## Harness integration

The plugin follows the standard DSH host-plugin contract:

- It exports `name` / `inject` / `apply`; `inject = ['tools']` is its only runtime service dependency (`@deepseek-ai/dsh-tools`).
- `apply(ctx)` wraps every `ctx.tools.register(defineTool({...}))` in `ctx.effect(...)` so Cordis disposes the registrations with the plugin fiber.
- `defineTool` declares model-visible `parameters`, a validated canonical `output.schema`, and a pure `output.render` text projection.
- `execute(args, exec)` resolves every path against `exec.agent.session.header.cwd`; relative paths stay in the session workspace and absolute paths are accepted only when still inside it. A `realpath` check on the nearest existing ancestor closes the symlink escape hatch.
- Image files must live inside the session workspace (`.png/.jpg/.jpeg/.gif`, 20 MiB each); explicit inch coordinates `x/y/w/h` are supported, or omit them for automatic placement below the text.
- Writes go through a same-directory temp file + `rename`; `overwrite` defaults to `false`.

## Build

```bash
pnpm install
pnpm run check   # typecheck + tests + build
```

Artifacts: `lib/index.js` (ESM host bundle with Office libraries inlined; `@deepseek-ai/*` and `cordis` stay external) and `lib/types/**/*.d.ts`.

## Install

```bash
dsh plugin --profile web add github:kw78/dsh-office-tools
# or from a local checkout:
dsh plugin --profile web add /path/to/dsh-office-tools
```

Restart the DSH server after installation. The seven tools appear in the next prompt assembly.

## Community indexes

- Registration blocks for awesome-dsh-plugin / dsh-market are in [docs/hub-registration.md](docs/hub-registration.md).
- Recommended repository topics: `dsh`, `dsh-plugin`, `deepseek-harness`, `office`.

## Safety

- All file access is confined to the calling agent's session workspace.
- Reads are capped at 50 MiB; text/cell results are bounded and mark `truncated`.
- Creates/updates are bounded by row and cell limits and refuse overwrites by default.
- No LibreOffice/PowerPoint/Word subprocess is spawned; formats are generated and parsed with pure-JS libraries.
