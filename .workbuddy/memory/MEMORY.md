# dsh-desktop-me 项目约定

## 自制 DSH 插件 defineTool schema DSL
宿主 `@deepseek-ai/dsh-tools` 的 `defineTool` **不接受原生 JSON Schema**；写错会让 harness 启动时直接 exit 1：
- `parameters` = 「属性名 → 值 schema」映射，必填用属性级 `required: true`。不写顶层 `required: [...]`，不包 `{type:'object',properties:...}`（报 `parameters.type must be a value schema object`）。
- `output.schema` 用 `{ type: 'json' }` 最稳；严格 object 须显式 `additionalProperties`，不支持联合类型，用 `oneOf`。
- `output.render` **必填**，返回 `[{ type: 'text', text }]`；execute 返回值按 `output.schema` 校验，render 每次成功调用后执行。
- 注册用 `ctx.tools.register(definition)` **单参数**（definition 自带 name+output）；双参会报 `tool "undefined" must declare output`。
- inject 服务名复数 `tools`。

## Harness home / 目录布局
- `DSH_HOME` = 程序运行目录下的 `data`：打包态 `dirname(process.execPath)`，dev 态 `app.getAppPath()`。注入位置 `src/main/runtime/harness-runtime.ts:buildHarnessSpawnOptions`。
- `launch-root`（harness cwd）在 `userData` 下，与 `DSH_HOME` 不同。
- 副作用：`DSH_HOME` 指向 `data` 后 harness 不再读 `~/.dsh`。

## 插件注册进打包产物的两条路径
### A. profile 插件（data/profiles/web 为真源）
- 构建只原地做：`normalizeModulesMetadata` + `trimNativePrebuilds` + `trimPdfjsBuild`；`bin/` 每次从 `~/.mnemon/bin` 刷新；`settings.yaml` 用模板覆盖。
- ⚠️ **market UI 装插件 = 隐式 pnpm install**，会把 profile 顶层 `@deepseek-ai/*` 重置回 npm 旧版 → 启动崩。**装完必须立刻重跑 `NODE_OPTIONS="" node scripts/sync-harness-pkgs.mjs`**。
- 本地未发布插件用 `file:`（自包含）；`link:` 依赖见下条。
- 包名别撞 npm：`dsh-taskboard` 已被占用，本地四象限板改名 `dsh-quadrant-board`。

### B. 桌面壳自有注入插件
- 根 `package.json` 的 `file:` 依赖 → electron-builder 打包；运行时靠 `build/dsh-desktop.patch.yml` 的 `insert` 块，由 `src/main/index.ts` 传给 harness。
- ⚠️ **cordis 不允许跨 patch 层重复 entry id**，即使都 `disabled: true` 也报错。

## link: 依赖的模块解析坑（2026-09-06）
profile 用 `"pkg": "link:E:/.../pkg"` 时 node_modules 里是符号链接；Node ESM 按 realpath 解析，会脱离 profile 的 node_modules → 第三方 import 报 `Cannot find package 'xxx'`。
- 最小侵入修复：在插件目录建 `node_modules/<dep>` **junction** 指向 profile 同名包（`fs.symlinkSync(target, path, 'junction')`，Windows 免管理员）。
- 排查只报第一个失败的包，改完要全量扫描 `lib/` 非 `node:`、非相对 import。

## 构建链路
- 流程：`npm run build`（electron-vite）→ `node scripts/bundle-user-data.mjs` → `npx electron-builder --win --x64`。
- ⚠️ 必须在普通终端跑，WorkBuddy 的 safe-delete 垫片会让构建死锁 / harness boot 崩。

## pnpm 使用要点
- 仓库内 pnpm：`node_modules/pnpm/bin/pnpm.cjs`（v11.21.0）；Git Bash 直接调会盘符错乱，改用 PowerShell 原生路径或 `NODE_OPTIONS=""` + 托管 node 绝对路径。
- profile 重建：`data/profiles/web/` 下 `pnpm install --no-frozen-lockfile`；`pnpm-workspace.yaml` 是 `nodeLinker: hoisted`。
- `.modules.yaml` 的 `storeDir` 只是安装期元数据，运行时不读。
- ⚠️ 对 `data/profiles/web` 的 pnpm 操作被中断可能移走部分包，务必跑完。

## web profile 的 node_modules 不纳入 git（2026-08-22 起）
体积过大已不跟踪，由 `pnpm install` 重建。真源是 `package.json` / `pnpm-lock.yaml` / `pnpm-workspace.yaml` / `cordis.yml` / `cordis.patch.yml`。

## 插件 generation 原子更新机制（.generations）
- 结构：`data/profiles/.generations/{live,staging,trash}` + `desired.json`（事实源，generation id 数组）。
- 启动流程 `prepareGenerationsForLaunch` 跑 `sweepRegistry` + `projectGenerations`；`resolveEnabledGenerations` 若 desired 指向不存在的 live 目录会直接抛错，进入安全模式。
- 校验 `verifyGenerationPeers` 要求 `live/<id>/node_modules/<pkg>` 是真实目录且有可读 `package.json`。
- 2026-09-06 已修：pnpm hoisted 会把顶层远程 npm 包物化为指向 `.pnpm` store 的 symlink，导致 self-contained 校验失败。修复在 `packages/dsh-desktop-market-installer/generations/installer.mjs` 增加 `dereferenceTopLevelSymlinks`。
- **排障公式**：`DSH_HOME=data NODE_OPTIONS="" node node_modules/@deepseek-ai/dsh/lib/bin.js web --dump-config`（EXIT=0=健康）；检查 `desired.json` 与 `live/` 是否一致。

### 2026-09-08 修复：dsh-computer-use generation 损坏导致安全模式
- 现象：启动报 `pending plugin removal projection failed: generation projection failed: Enabled generation package manifest is missing or unreadable for dsh-computer-use: ENOENT: .../node_modules/dsh-computer-use/package.json`。
- 根因：`desired.json` 指向的 `live/dsh-computer-use+0.2.0+...` 里 `node_modules/dsh-computer-use` 是空目录，`package.json` 缺失；无 `.7z` 恢复包。
- 修复（最低侵入）：
  1. 备份 `desired.json`。
  2. 从 `desired.json` 移除该 generation id（保留其余 19 个）。
  3. 把坏掉的 `live/dsh-computer-use+...` 移到 `trash/`。
  4. `web/node_modules/dsh-computer-use` 是真实目录且可用（版本 0.2.3），回退到普通 profile 包运行。
  5. 重启桌面壳退出安全模式。
- 后续：如需重新用 generation 管理该插件，从 market 重新安装/升级。

## js-yaml 版本 / ESM interop 坑（2026-09-06）
- 现象：harness loader 报 `yaml.Type is not a constructor` 或 `js-yaml does not provide export named 'default'`。
- 根因：profile 顶层 `js-yaml` 是 5.4.1，但 `@deepseek-ai` harness 0.1.2-rc.1 编译产物混用 4.x API（`yaml.Type`/`Schema`/`JSON_SCHEMA.extend`）。
- in-place 修复：根 `node_modules/js-yaml` 和 `data/profiles/web/node_modules/@deepseek-ai/node_modules/js-yaml` 都换成 4.3.2 + `esm-shim.mjs` 重导出。
- 持久化待办：应在 profile `package.json` 加 overrides 锁兼容版本 + pnpm patch，或推动上游统一 ESM 导入。

## git 引用写入怪象
- 本机 PortableGit 1.2.0 在 `refs/remotes/origin/*` 新建引用时可能写入被吞（rc=0 但不落盘）。
- 绕过：手写 `.git/refs/remotes/origin/<branch>` 再 `git pack-refs --all`。
