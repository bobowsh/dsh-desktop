# dsh-desktop-me 项目约定

## Harness home 目录（DSH_HOME 注入目标历经多次变更）
- 历史：最早桌面壳把 harness 数据根改写成 `<userData>/harness`；2026-08-16 一度移除 `DSH_HOME` 注入，让 harness 用默认 `~/.dsh`；**2026-08-17 用户要求重新注入 `DSH_HOME`，指向"当前运行程序目录下的 `data` 目录"**（便携化：数据跟 exe 走）。
- 当前实现（2026-08-17 生效）：
  - `src/main/index.ts`：`dshHome = join(app.isPackaged ? dirname(process.execPath) : app.getAppPath(), 'data')`。
    - 打包态：程序目录 = `dirname(process.execPath)`（即安装目录下的 .exe）。
    - dev 态：`app.getAppPath()` = 项目根目录，故 `data` 落在项目根，避免落入 `node_modules/electron/dist/` 旁。
  - `src/main/runtime/harness-runtime.ts` 的 `buildHarnessSpawnOptions` 在 env 里重新注入 `DSH_HOME: dshHome`（之前 08-16 那次把注入删了，`dshHome` 形参成了死参数；现在恢复注入）。
  - harness 子进程 `mkdir(dshHome, recursive)` 保证目录存在。
  - 安装器（2026-08-18 新增）：`build/installer.nsh` 的 `customInstall` 在安装完成时把**用户环境变量** `DSH_HOME` 写为 `$INSTDIR\data`（`HKCU\Environment` + `WM_SETTINGCHANGE` 广播，新进程立即可读，无需重启）；`customUnInstall` 仅在当前值仍等于 `$INSTDIR\data` 时删除（用户改指别处则保留）。目的：桌面壳外启动的进程（CLI/编辑器/脚本）也能解析到同一 harness home。语法已用 makensis 3.0.4.1 最小脚本验证通过。
- ⚠️ **副作用（重要）**：DSH_HOME 一旦指向程序目录/data，harness 就不再读 `~/.dsh`：
  - 现有 `~/.dsh`（30+ 插件、`settings.yaml`、`.credentials.yaml` 里的 API Key）**全部失效**，harness 启动后读写的是全新的空 `data` 目录 → 相当于"全新空 harness"。
  - 安装器现在把 `data/`（settings.yaml + profiles/web + bin，白名单）释放到 `$INSTDIR\data`，与 DSH_HOME 一致（见下"插件注册"路径 A）；旧的 bundled-user-data → `~/.dsh` 链路已废弃。
  - dev 跑时 `process.execPath` 是 electron.exe，`data` 会落在 `node_modules/electron/dist/` 旁边（非项目目录）——已通过 `app.isPackaged ? dirname(execPath) : app.getAppPath()` 分支解决，dev 下落在项目根目录。
- `launch-root`（harness 启动 cwd）仍在 `userData` 下，与 DSH_HOME 是两回事，未动。

## 插件如何注册进打包产物（两条路径）
工程里"把插件打包进安装器"有两条互不相同的机制，新增插件前先判断走哪条：

### 路径 A：profile 插件（社区包，如 dshmarket / dsh-better-sidebar / dsh-rule-manager 等 30+ 个）
- **真源（single source of truth）= `data/profiles/web`（dev DSH_HOME 即打包源，2026-08-18 用户变更）**。`bundle-user-data.mjs` **不再从 `~/.dsh/profiles/web` cpSync 覆盖** data/profiles/web（旧约定"改 live profile 别改快照"已废弃）；构建只对 data/profiles/web **原地**做：`normalizeModulesMetadata`（剥 `node_modules/.modules.yaml` 的 `storeDir`/`virtualStoreDir` 机器绝对路径，`virtualStoreDirMaxLength` 数字字段无害保留；`pnpm-workspace.yaml` 若缺 `storeDir: ~/AppData/Local/pnpm/store` 则追加）+ `trimNativePrebuilds`（pdb/非 x64 prebuilds）+ `trimPdfjsBuild`。打包产物 = data/profiles/web 的当前内容（白名单 `extraResources filter: ["settings.yaml","profiles/web/**","bin/**"]`，`from: data` → `$INSTDIR\data`）。
- 装/更新插件：直接在 `data/profiles/web` 里做（market UI，或仓库内 pnpm `packages/dsh-desktop-market-installer/node_modules/pnpm/bin/pnpm.cjs` + `NODE_OPTIONS=""`，避 Git Bash 盘符坑 `e:\e\work\...`）；改完重新构建即进包。`pnpm-workspace.yaml` 是 `nodeLinker: hoisted`，node_modules 自包含（HardLink 拷出物化为独立文件，非 symlink）。
- ⚠️ **data/profiles/web 是 dev 真源，坏了没有 live 可恢复**（以前可从 ~/.dsh 重拷）：对它的 pnpm 操作被中断可能移走部分包（如 @anionex scope 消失导致 harness 启动失败），务必跑完整个命令。
- ⚠️ `.modules.yaml` 的机器路径：构建时被剥（打包产物干净）；dev 运行时桌面壳 `harness-runtime.ts` 的 `syncModulesMetadata` 启动时重写当前机器 storeDir。dev 里 `pnpm add` 前若 .modules.yaml 无 storeDir 会报 `ERR_PNPM_UNEXPECTED_STORE`（重启 dev 或手动补回）。
- `bin/` 仍每次从 `~/.mnemon/bin` 刷新（构建输入）；`settings.yaml` 仍用 `data/settings.template.yaml` 覆盖（防泄漏：dev UI 改的 provider/key 不会进包）。
- 插件靠自身 package.json 的 cordis 字段自注册；profile 级 `cordis.yml` / `cordis.patch.yml` 可覆盖配置。

### 路径 B：桌面壳自有注入插件（如 dsh-desktop-market-installer）
- 它是根 `package.json` 的 `file:` 依赖 → 进 app `node_modules` → 由 electron-builder `files: node_modules/**/*` 打包。
- 运行时注册靠 `build/dsh-desktop.patch.yml` 的 `insert` 块（每个 entry 有 `id`/`name`，可加 `disabled: true` 关闭）——`src/main/index.ts:492` 把该 yml 作为 `dshPatchPath` 传给 harness，每次启动强制注入，与用户 profile 无关。
- yml 本身经 `extraResources` 从 `build/dsh-desktop.patch.yml` → `resources/dsh-desktop.patch.yml`。

### 构建链路（build-installer.ps1）
`npm run build`（electron-vite）→ `node scripts/bundle-user-data.mjs`（data 原地整理：profiles/web 剥机器路径+瘦身、bin 从 ~/.mnemon 刷新）→ `npx electron-builder --win --x64`。⚠️ 必须在普通终端跑，不要在 WorkBuddy 里跑（safe-delete 垫片会让 electron-builder 死锁）。

### 验证 pnpm bin 的小坑
仓库内 pnpm bin 在 `packages/dsh-desktop-market-installer/node_modules/pnpm/bin/pnpm.cjs`（v11.21.0，由 `dsh-desktop-market-installer` 的 `pnpm` 依赖 pin 决定，已 bump 10.34.5→11.21.0）。在 Git Bash 直接用会盘符错乱（`e:\e\work\...`），务必用 PowerShell 原生路径或 `NODE_OPTIONS=""` + 绝对 Windows 路径调托管 node。
- ⚠️ store 路径记录不一致**不是致命问题**：`node_modules/.modules.yaml` 的 `storeDir` 只是 pnpm 安装期元数据，**DSH 运行时不读它**，绝不影响 app 启动/运行。若 active pnpm 解析出的 store 与记录不一致（如用 pnpm 10 跑 v11 profile、或 `.npmrc` 改了 store-dir），pnpm 在下次 `install` 会**自愈**（按 active store 重新硬链、重写 `.modules.yaml`），不报硬错；唯一风险场景是"记录的 store 已删 + 离线 + 需拉新包"才会失败。本 profile 实测：`.modules.yaml` storeDir=v11、`~/.npmrc` 无 store-dir 覆盖、实际 store 含 v11（另残留无用的 v10），三处一致 → 无问题。
