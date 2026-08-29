---
name: upstream-merge
description: 把 origin/main（dataelement/dsh-desktop 上游）合并到 bobowsh 开发分支的完整流程。涵盖仓库损坏修复、patch 版本对齐、BOM 编码坑、测试验证。用于每次上游同步（通常紧跟一次 DSH rc 版本升级）。
---

# 上游合并流程（origin/main → bobowsh）

把上游 `origin/main` 合并到本地 `bobowsh` 开发分支。本流程假设你已在 `E:\work\dsh-desktop-me` 工作区。

## 前置：环境对齐

- 本会话 pwsh 5.1；写二进制/UTF-8 文件用 `cmd /c "git show ... > file"`，**不要**用 pwsh `>` 重定向（会写 UTF-16LE BOM 损坏文件）。
- git 走 schannel 会报 `SEC_E_NO_CREDENTIALS`，加 `-c http.sslBackend=openssl` 绕开；github.com 偶发超时，fetch 失败重试即可。
- node 在 PATH 里的 `node_modules/.bin/node` 是 no-op stub，跑脚本须显式 `$env:PATH="d:\nodejs;$env:PATH"`。
- 合并前先把本地未提交修改**提交成一个 commit**（不用 stash）：`git add -A && git commit`。这样既保证工作树干净可 merge，本地改动又留在历史里可追溯；且 merge 是真正的三方合并，不会像 stash pop 那样事后回放冲突。仓库若损坏导致 commit 失败，见步骤 1 的修复路径。

## 步骤 1：检查仓库完整性

```pwsh
cd E:\work\dsh-desktop-me
git fsck --no-dangling 2>&1 | Select-Object -First 10
git merge-base HEAD origin/main
```

若 `git fsck` 报 `invalid sha1 pointer` 或 `Could not read <sha>`，说明 object database 损坏（关键祖先 commit 丢失）。此时 `git fetch` 无法补回——git 认为已有这些 ref，不会重传缺失 object。

### 损坏修复路径

1. 若有干净克隆（如 `E:\work\dsh-desktop-new`），从那里复制 packfile：
   ```pwsh
   Copy-Item E:\work\dsh-desktop-new\.git\objects\pack\*.pack E:\work\dsh-desktop-me\.git\objects\pack\
   ```
2. 或修复坏 tag 后重新 fetch：
   ```pwsh
   git tag -d v0.3.1   # 删坏的 tag 指针
   git -c http.sslBackend=openssl fetch origin main
   ```
3. 若 `git add -A && git commit` 因 `invalid object` 失败——先备份工作区修改文件到临时目录，再修仓库。
4. 仓库修好后，用户可能已手动修复，继续下一步。

## 步骤 2：先把本地修改提交（不 stash）

合并前必须用 commit 把工作区清零，再用 `git merge`。这样本地改动进入历史、可被 merge 做三方合并，不会像 stash pop 那样事后回放冲突。

```pwsh
git add -A
git commit -m "wip: pre-merge local changes ($(Get-Date -Format yyyy-MM-dd))"
# 若没有可提交的改动，commit 会失败（nothing to commit）——属正常，直接进步骤 3
```

⚠️ 若 `git commit` 失败报 `invalid object`（仓库损坏），不要 stash，先按步骤 1 修复仓库；修好前可手动 `Copy-Item` 备份改动文件到临时目录。

## 步骤 3：执行合并

```pwsh
git merge origin/main --no-edit
```

## 步骤 4：解决冲突（按文件类型分类）

合并 origin/main 通常伴随 DSH 包版本升级（如 rc.1 → rc.2），冲突模式固定。

### 4.1 配置文件（.gitignore / package.json / release.yml）

- `.gitignore`：保留 HEAD 的详细注释版，合并上游新增条目（如 `.coaligne/`）。
- `package.json`：
  - **dependencies**：取上游升级后的版本（rc.1 → rc.2）。
  - **overrides**：上游若移除了 dsh-* overrides，同步移除（rc.2 不再需要 pin）。
  - **build.extraResources**：合并两边的资源条目（本地 data/scripts + 上游 safe-mode.html/windows-menu.html）。
- `.github/workflows/release.yml`：publish job 的 `if` 条件取上游版（加 `sign-windows.result == 'success'`）。

### 4.2 patch 文件（patches/@deepseek-ai+dsh-*+rc.*.patch）

**全部取 origin/main 版本**——patch 文件随包版本升级重命名，本地修改的 patch 已被上游合并/重写：
```pwsh
cmd /c "git show origin/main:patches/@deepseek-ai+dsh-client-ui-settings-models+0.1.1-rc.2.patch > patches\@deepseek-ai+dsh-client-ui-settings-models+0.1.1-rc.2.patch"
```

⚠️ **必须用 `cmd /c "..."` 写文件**，pwsh `>` 会写 UTF-16LE BOM，导致后续 `JSON.parse` / patch apply 失败。

### 4.3 rename/delete 冲突（patches/@deepseek-ai+dsh+rc.1.patch → rc.2.patch）

上游把 rc.1 patch 重命名为 rc.2，本地删除了旧文件。直接写 rc.2 版本即可，git add 后冲突自动解决。

### 4.4 源码冲突（src/main/, src/preload/）

逐个解决，原则：
- **上游新增功能取上游版**：`mountSafeModeBanner()`、`resolveShellEnvironment()`、`mobileBridge.start()`。
- **本地扩展保留**：`useElectronRuntime` 参数、`ENABLE_MOBILE_BRIDGE` guard、便携 `dshHome` 路径。
- **用户放弃的功能直接丢弃**：如版本号显示（3 个 commit）可整体放弃，取上游简化版。
- `src/preload/windows-titlebar.ts` 若本地重写了自定义菜单，取上游简化版即可（除非用户明确要保留）。

### 4.5 测试冲突（test/）

- `test/runtime.test.ts`：保留两边测试（上游的 safe-mode 测试 + 本地的 electron runtime 测试）。
- `test/preset-transfer-patch.test.ts`、`test/model-settings-catalog-ux-patch.test.ts`、`test/feishu-release-notes.test.ts`：直接取上游版（上游测试适配了新的 patch 内容）。
```pwsh
cmd /c "git show origin/main:test/preset-transfer-patch.test.ts > test\preset-transfer-patch.test.ts"
```

### 4.6 package-lock.json

直接取上游版，但版本号要手动对齐到 `package.json` 的 version：
```pwsh
cmd /c "git show origin/main:package-lock.json > package-lock.json"
node -e "const f=require('fs'); const p=JSON.parse(f.readFileSync('package-lock.json','utf8')); p.version='<version>'; if(p.packages['']) p.packages[''].version='<version>'; f.writeFileSync('package-lock.json', JSON.stringify(p,null,2)+'\n')"
```

## 步骤 5：重新安装依赖 + 重打 patches

合并后 node_modules 里还是旧版本包，patch 文件已指向新版本。必须重装：

```pwsh
$env:PATH="d:\nodejs;$env:PATH"
npm install --prefer-offline
npx patch-package
```

⚠️ patch-package 会报版本不匹配警告（patch 是 rc.2 但装的还是 rc.1）——若 `npm install` 成功装了 rc.2，patch 会全部成功。若 patch apply 失败（`has changed since you made the patch file`），说明 node_modules 还是旧版本，确认 `npm install` 完成。

## 步骤 6：跑测试验证

```pwsh
$env:PATH="d:\nodejs;$env:PATH"
npx vitest run
```

**环境相关的失败（非合并问题）**：
- `test/feishu-release-notes.test.ts`：`spawnSync python3 ENOENT`——Windows 无 python3，忽略。

**合并相关的失败排查**：
- `test/release.test.ts` version mismatch：package-lock.json version 没对齐 package.json，回步骤 4.6。
- `test/model-settings-catalog-ux-patch.test.ts`：读取的是 patch 后的 node_modules 源码，若 patch 没 apply 成功（BOM 损坏），重做步骤 4.2 + 5。
- `test/preset-transfer-patch.test.ts`：同上，取上游版测试 + 重打 patch。

## 步骤 7：完成合并提交

冲突解决完后，结束 merge（步骤 2 的 pre-merge commit 已保留本地改动，无需再恢复）：

```pwsh
git add -A
git commit --no-edit   # 仅当 merge 有冲突、需要收尾合并提交时执行
```

- 若 merge 是快进（fast-forward）或无冲突，git 已自动完成，无需此步。
- 本地改动已保存在步骤 2 的 pre-merge commit 里，不再需要 stash pop。
- 若用户放弃了某些本地功能（如版本号显示）：合并时取上游版覆盖即可，pre-merge commit 里那份旧改动仍留在历史中（不 revert），下次 merge 自然被上游覆盖；如想彻底清理可在合并后用 `git revert <pre-merge commit>` 或交互式 rebase 整理。

## 坑点清单

### BOM 编码损坏（最高频）

pwsh 5.1 的 `>` 重定向默认 ANSI/UTF-16LE，会损坏无 BOM 的 UTF-8 文件。**所有从 git show 写文件的场景都用 `cmd /c "git show ... > file"`**。已损坏的文件用以下方式修复：
```pwsh
$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::Unicode)
[System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
```

### 仓库 object database 损坏

症状：`git merge-base` / `git log` / `git commit` 报 `Could not read <sha>`，`git fsck` 报 `invalid sha1 pointer`。
原因：本地 packfile 缺失祖先 commit，fetch 无法补回（git 认为已有 ref）。
修法：从干净克隆复制 packfile，或删坏 tag 后重新 fetch。

### patch 版本错位

patches/ 目录的文件名带版本号（`dsh+0.1.1-rc.2.patch`），但 node_modules 里装的包版本可能滞后。合并后必须 `npm install` 装新版包再 `patch-package`，否则测试读到的源码和 patch 不一致。

### commit 失败（替代原 stash 失败）

仓库损坏时 `git add -A && git commit` 会失败（invalid object）。修仓库前先手动备份工作区改动文件（`Copy-Item` 到临时目录），修好仓库后重新执行步骤 2 的提交再 merge。

### git push 的 exit 1 误报

pwsh 5.1 下 git push 的 stderr 进度输出会被报成 NativeCommandError，exit 1 但推送其实成功。用 `git status -sb` 确认。

## 放弃本地功能的处理

用户若说"某功能不要了"（如版本号显示）：
1. 合并冲突时取上游版本（覆盖本地修改）。
2. 无需 stash drop——本地改动已在步骤 2 的 pre-merge commit 里；取上游版即覆盖了工作区，提交合并即可。
3. pre-merge commit 里那份旧改动仍留在历史中（不 revert），下次 merge 时自然被上游覆盖；如想彻底清理，合并后用 `git revert <pre-merge commit>` 或在 rebase 时 drop 该提交。
