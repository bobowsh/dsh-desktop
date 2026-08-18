# dsh-skill-manager-ytxue

DSH Web 插件：在**设置**侧边栏中提供「Skill 管理」面板（列表 / 启用 / 停用 / 规范检查与自动修复）。

## 功能

- **设置侧边栏条目**：设置 → 侧边栏导航「Skill 管理」（注册 `settings.section` slot，`order: 900`）。
- **工具栏**：「刷新」（外部手动放入/改动 skill 后重新拉取列表）与「一键检查」（对红点条目检查并修复）。
- **导入 Skill（支持文件夹选择、批量、重名询问）**：
  - **选择文件夹**：输入框右侧 📂 图标打开内置目录浏览对话框——从**"此电脑"（全部盘符）**起步，可进入任意磁盘、任意层级；对话框标题栏右侧为 **[选择此文件夹] [✕]**（选择在关闭左边），底部为独立的 **[返回上级文件夹]** 按钮避免误按；条目类型直接读取（不逐个探测），权限受限目录也不缺失；选中后自动填入路径；也可直接手动输入路径；
  - **单/批量自动识别**：路径是单个 skill（含 `SKILL.md` 的目录或 `.md` 文件）→ 导入 1 个（`kind: single`）；路径是包含多个 skill 的大文件夹 → 自动逐个导入直接子级（含 `SKILL.md` 的子目录 + 顶层 `.md` 文件），非 skill 文件忽略（`kind: batch`）；
  - **重名询问（同系统重名文件逻辑）**：先预检（dry-run），发现重名时弹窗显示"将导入 N 个，M 个与现有条目重名：xxx"，由您选择 **跳过重名并导入其余** / **覆盖重名（替换现有）** / **取消**——不再默默跳过；
  - 目标选择：**复制到启用目录 `skills\`（立即生效，导入后自动检查修复）**或**复制到池 `skill-pool\`（零挂载，之后按需启用）**；
  - 自动 kebab 规整（实测 `guizang-ppt-skill-main` → `guizang-ppt-skill`）；结果逐条显示 ✓（覆盖标记）/△（重名跳过）/✗（失败）与警告。
- **状态总览**：已启用目录 `~/.dsh/skills\`（**系统级**，DSH rank 400 原生扫描）与池目录 `~/.dsh\skill-pool\`（零挂载）双列表。
- **系统级 / 项目级标识**：每个条目在 `bundle`/`flat` 标签后显示来源级别——**系统级**（`~/.dsh/skills`，对全部项目生效）与**项目级**（`<项目根>\.dsh\skills` rank 100 / `<项目根>\.agents\skills` rank 200，仅该项目生效；只读展示、灰点、不参与规范检查）。
- **当前项目自动识别（切换会话即生效）**：默认**只显示当前项目的 skill**——面板打开/刷新时，客户端把**当前会话的工作目录**传给 host（订阅客户端 sessions 服务，切换会话立即同步，无需发言），host 向上探测 `.git` 祖先（与 DSH skill-filesystem 判定一致，无 `.git` 用 cwd 自身）。切到哪个文件夹的会话，面板就只显示哪个文件夹的项目级 skill，不显示其他项目的。`<dshHome>` 自身自动排除避免与系统级重复；`config.projectRoots` 可显式补充展示（标「配置」）。
- **内容简介**：每行显示 frontmatter `description`（无简介时提示"（无简介）"）。
- **红/绿点（检查状态）**：名字旁圆点——**绿点** = 规范已检查且内容未变；**红点** = 尚未检查或内容已变更。依据 `~/.dsh/skill-manager-ytxue.checked.json`（按 SKILL.md 内容指纹 sha1 判定）。
- **状态驱动的规范检查**：检查只针对**未检查（红点）**的 skill——首次启用全量检查，之后每次（含插件每次启动）只检查新增/被修改的条目，**已检查（绿点）的自动跳过**。不合规自动修复并写日志 `~/.dsh/skill-manager-ytxue.log`：
  - 目录名/文件名非 kebab-case → 规整重命名（同步 frontmatter name）
  - frontmatter `name` 缺失/非 kebab/与目录名不一致 → 以目录名为准修正
  - `description` 缺失 → 补充占位描述（DSH 会排除无 description 的 skill）
  - 布尔字段（`disable-model-invocation` / `user-invocable`）驼峰拼写 → 改为 kebab；非布尔值 → 修正/删除（`TRUE/FALSE/1/0/yes/no/on/off` 均识别）
- **启用 / 停用**：池 ↔ 启用目录间移动（目录 bundle 与平铺 `.md` 均支持；冲突/重复安全报错，绝不覆盖）。

### 关于 "bundle" / "flat" 标识

DSH 的 skill 条目有两种形态，面板在名字旁用标签区分：

| 标签 | 形态 | 说明 |
|---|---|---|
| **bundle** | 目录：`skills\<name>\SKILL.md` | 一个目录，正文在 `SKILL.md`，可附带脚本/模板/资源等**多文件**（如 docx 的 scripts/、guizang-ppt-skill 的 assets/）。适合功能复杂的 skill。 |
| **flat** | 单文件：`skills\<name>.md` | 整个 skill 就是**一个 Markdown 文件**。适合纯指令型 skill。 |

两者对 DSH 完全等价（同样被扫描、同样 frontmatter 要求），面板操作（启用/停用/检查）行为一致；标签只提示你"这个 skill 是目录型还是单文件型"，移动管理时两者都按整个条目（目录或文件）整体移动。

## 安装（两种方式：git clone 获取 + dsh 挂载）

> ⚠️ **包名说明**：npm 上的 `dsh-skill-manager`（maintainer: `gohana`，版本 0.1.x，发布于 2026-08-13）是**无关的第三方包**，与本项目不同。本项目包名为 **`dsh-skill-manager-ytxue`**（`ytxue` 为作者昵称，用于区分）。请勿通过 `npm install dsh-skill-manager`（会装到该第三方包）；**安装一律以本仓库为准**：
> - 推荐：`git clone https://github.com/YTxue/dsh-skill-manager-ytxue.git` 后按方式 B 挂载；
> - 或：`dsh plugin --profile web add git+https://github.com/YTxue/dsh-skill-manager-ytxue`（带仓库地址，不经过 npm 同名包）。

源码托管于 GitHub：`git clone https://github.com/YTxue/dsh-skill-manager-ytxue.git`。

### 方式 A：git clone + dsh plugin 命令（推荐）

```bash
git clone https://github.com/YTxue/dsh-skill-manager-ytxue.git
dsh plugin --profile web add /path/to/dsh-skill-manager-ytxue   # pnpm 装入 profile 依赖树
```

然后在 `$DSH_HOME/profiles/web/cordis.patch.yml` 追加挂载条目（见方式 B 第 2 步），重启 DSH 生效。

### 方式 B：git clone + 手动挂载（DSH 原生机制，任何环境通用）

```bash
git clone https://github.com/YTxue/dsh-skill-manager-ytxue.git
```

1. 将 `dsh-skill-manager-ytxue` 目录放入 profile 依赖树：`$DSH_HOME/profiles/web/node_modules/dsh-skill-manager-ytxue/`（依赖 `@deepseek-ai/*` 经 `$DSH_HOME/profiles/node_modules` 的 junction 解析，任何标准 DSH 安装都有）。
2. 在 `$DSH_HOME/profiles/web/cordis.patch.yml` 追加：

   ```yaml
   - insert:
       - id: skill-manager-ytxue
         name: 'dsh-skill-manager-ytxue'
   ```

3. 验证配置树：`dsh --profile web --dump-config`（应出现 `skill-manager-ytxue` 条目）。
4. 重启 DSH 后打开设置 → 「Skill 管理」。

> 说明：DSH 插件无需 `plugin.json`——插件元数据（入口、客户端注入、bundle patch）统一声明在 `package.json` 的 `main`/`exports["./client"]`/`dsh` 字段（与官方生态 `dsh-*` 包一致）。

> **常见错误排查**：若启动报 `Cannot find package '@deepseek-ai/...'`（如 `dsh-home-paths`），说明插件放在了依赖查找链之外的位置。本插件 host 端为**零第三方依赖**（仅 node: 内置模块 + cordis 服务注入），标准方式下任何位置（含 `~/.dsh/plugins/`）均可加载；若仍报错，请确认插件目录与 DSH 安装目录在同一个 Node 解析链上（推荐 `profiles/web/node_modules/` 或 `dsh plugin add`）。

### 配置项目级 skill（可选，DSH 通用方式，通常无需配置）

项目根默认**自动发现**（当前会话 cwd 的 `.git` 祖先 + workspace 注册表）。仅当某项目从没开过会话、又想展示时，用 **DSH 通用配置方式**——在 `$DSH_HOME/settings.yaml` 顶层加本插件的命名空间键：

```yaml
skill-manager-ytxue:
  projectRoots:
    - '/path/to/project1'
    - '/path/to/project2'
```

> 兼容说明：旧版 `cordis.patch.yml` 挂载条目 `config.projectRoots` 写法仍有效（自动合并兜底），新配置请优先使用 settings.yaml。

## 平台支持与注意事项

- **作者实测环境**：Windows（PowerShell 5.1 + Node 20+），仅在本机完整验证。macOS / Linux（含虚拟机）请按上文安装指南操作；如有问题欢迎提 Issue 反馈。
- **Linux / 虚拟机特别提醒**：
  1. **安装位置**：放入 `<dshHome>/profiles/web/node_modules/dsh-skill-manager-ytxue/` 并挂载 patch（见上文方式 B）。本插件 host 端为零第三方依赖，也可放入 `~/.dsh/plugins/` 等位置。
  2. **bundles 清单残留（删除插件后启动失败）**：若曾用 `dsh plugin add` 安装后删除插件目录，启动会报 `cannot resolve profile bundle "dsh-skill-manager-ytxue"`——请从 `~/.dsh/profiles/web/package.json` 的 `dsh.profile.bundles` 与 `dependencies` 中移除 `dsh-skill-manager-ytxue` 条目（可运行 `dsh plugin --profile web remove dsh-skill-manager-ytxue` 或手动编辑）。
  3. **端口占用**：启动报 `EADDRINUSE: 127.0.0.1:3080` 说明已有 DSH 实例在运行，先停止旧进程（`ss -ltnp | grep 3080` 找到 PID 后 `kill`，或 `pkill -f "dsh web"`）再启动。
  4. **网络（与插件无关）**：日志中其他插件的 `git`/`gnutls_handshake failed`（如 qwen-mm-plugins）属于 GitHub 网络链路问题（GFW/代理），重试或为 git 配置代理后重试即可。

### 健壮性说明（面向其他用户/环境）

- **零第三方运行时依赖**：core 仅用 `node:` 内置模块；host 端同样**零第三方依赖**（`homedir` 内联、settings 命名空间用普通函数 schema），任意位置（含 `~/.dsh/plugins/`）均可加载；client 仅 `require("react")`（平台种子词）+ `inject: ["slots", "sessions"]`。
- **零硬编码路径**：全部经 `defaultDshHome()`/`$DSH_HOME` 解析（grep 审计通过）；跨平台路径用 `node:path`。
- **错误不崩溃**：所有操作返回 `{ok:false, error}`；复制/删除失败捕获并报告；日志与检查状态文件写入失败静默降级。
- **不越界**：enable/disable/import 的目标目录严格限定在 `<dshHome>/skills` 与 `<dshHome>/skill-pool` 内；覆盖（overwrite）只删除目标目录内同名条目。
- **前端同源**：面板仅 fetch 本机 `/api/skill-manager-ytxue/*`，无外部请求。
- 已知无害事项：`lib/client.js` 顶层 `if (typeof window !== 'undefined')` 调试包裹（浏览器无碍，SSR 时需移除）；`lib/client.js.backup` 为历史备份（可从 git `original` tag 追溯，可安全删除）。

## HTTP API（host，loopback 同源）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/skill-manager-ytxue/state` | 双目录状态快照（含 description 与 checked 红绿点状态） |
| POST | `/api/skill-manager-ytxue/check` | 仅检查未检查项并修复，返回 `{checked, fixed, skipped}` |
| POST | `/api/skill-manager-ytxue/enable` | body `{name}` |
| POST | `/api/skill-manager-ytxue/disable` | body `{name}` |
| GET | `/api/skill-manager-ytxue/list-dir` | 目录浏览（选择器用），`?path=` 缺省为用户主目录 |
| POST | `/api/skill-manager-ytxue/import` | body `{source, target?, conflict?, dryRun?}`；dryRun 预检返回 `{kind, pending, conflicts, failed}`；执行返回 `{kind, imported, skipped, failed}` |

响应统一 `{ok, data?}` / `{ok:false, error}`。

## 文件

- `lib/index.js` — host 半区（cordis 插件：`apply`/`Config`/`inject`/`name`）
- `lib/client.js` — 浏览器半区（`__ModuleLoader__` AMD bundle）
- `lib/core.js` — 纯 Node 核心（检查/修复/池管理，可独立测试）

## 测试

`test/core-test.mjs` — core.js 单元测试（临时根，51 项：审计/自动修复/幂等/启停/冲突/导入/BOM/状态驱动）：

```bash
node test/core-test.mjs
```

## 部署状态（2026-08-14，已验证可用）

- 已装入 `$DSH_HOME/profiles/web/node_modules/dsh-skill-manager-ytxue/`
- 已挂载：`$DSH_HOME/profiles/web/cordis.patch.yml` → `insert: skill-manager-ytxue`
- 配置树验证：`dsh --profile web --dump-config` 含 `- id: skill-manager-ytxue / name: dsh-skill-manager-ytxue`
- **端到端验证通过**：设置侧边栏「Skill 管理」面板可操作（日志实测 `disable frontend-design` → `enable frontend-design`）；HTTP 接口 import/enable/disable 全链路 + 冲突保护实测通过；`/check` 真实根审计 `checked: 3, fixed: 0`（docx/frontend-design/guizang-ppt-skill 全部合规）；core 单元测试 51/51（含状态驱动跳过/指纹失效重查、BOM、kebab 重命名、description 补齐、布尔字段修正）。
- **权限提示**：插件需写入 `~/.dsh/`（`skills\`、`skill-pool\`、`skill-manager-ytxue.log`、`skill-manager-ytxue.checked.json`）——确保该目录对 DSH 进程可写；日志/状态文件写入失败不会阻塞主流程（静默降级）。
- **数据文件**：`~/.dsh/skill-manager-ytxue.log`（JSONL 审计/操作日志）、`~/.dsh/skill-manager-ytxue.checked.json`（检查状态表：skill 名 → 内容指纹+时间；内容变更即红点失效重查）。
- **已知修复记录**：
  - `client.js` 必须导出 `inject = ["slots"]`（运行时服务注入声明，与 package.json 的 `dsh.client.inject` 构建期声明互补）；缺失会导致 `cannot get property "slots" without inject`、loader entry 失败。
  - `lib/core.js` 的 `parseSkillDoc` 已剥离 UTF-8 BOM（PS 5.1 `Set-Content -Encoding UTF8` 等 Windows 工具写入的 SKILL.md 带 BOM，不剥离会使 frontmatter 解析失败）——该修复在磁盘上，**待下次重启 DSH 后生效**。
  - `client.js` 顶层有 `if (typeof window !== 'undefined')` 调试包裹，浏览器端无碍；未来做 SSR 时需恢复为直接 `window.__ModuleLoader__.load(...)`。
- 注意：插件代码修改后需**完整重启 DSH** 才生效（HMR 重载不刷新 Node ESM 模块缓存与浏览器启动图）；审计日志在 `~/.dsh/skill-manager-ytxue.log`。
