#!/usr/bin/env bash
# ============================================================================
#  DSH profile web 依赖修复 - apply (bash)
#  作用：移除 profile web 下两份过时的 @deepseek-ai/dsh-llm、dsh-settings
#        @0.0.1-rc.1 裸副本，使模块解析穿透到上层宿主根 @0.1.2-alpha.1。
#  幂等：快照已存在则中止（说明 apply 跑过，先 rollback 或确认再重跑）。
# ============================================================================
set -uo pipefail
PROFILE="E:/work/dsh-desktop-me/data/profiles/web"
NM="$PROFILE/node_modules/@deepseek-ai"
SNAP="E:/work/dsh-desktop-me/.dsh-dep-fix-snapshot"
SLLM="$NM/dsh-llm"
SSET="$NM/dsh-settings"

echo "[INFO] target profile : $PROFILE"
echo "[INFO] snapshot dir   : $SNAP"

# ---- 幂等守卫 ----
if [ -e "$SNAP" ]; then
  echo "[ABORT] 快照已存在于 $SNAP"
  echo "        这说明 apply 已经跑过。请先执行 rollback.sh 恢复，或确认后手动删除该快照再重跑。"
  exit 2
fi

# ---- Step 1: 建立快照目录 ----
mkdir -p "$SNAP"
did=0

# ---- Step 2: 快照 dsh-llm ----
if [ -d "$SLLM" ]; then
  echo "[SNAP] 备份 dsh-llm (0.0.1-rc.1) ..."
  cp -R "$SLLM" "$SNAP/dsh-llm"
  did=1
else
  echo "[INFO] dsh-llm 已不存在，无需快照"
fi

# ---- Step 3: 快照 dsh-settings ----
if [ -d "$SSET" ]; then
  echo "[SNAP] 备份 dsh-settings (0.0.1-rc.1) ..."
  cp -R "$SSET" "$SNAP/dsh-settings"
  did=1
else
  echo "[INFO] dsh-settings 已不存在，无需快照"
fi

# ---- 若都不存在，建空标记后退出 ----
if [ "$did" -eq 0 ]; then
  touch "$SNAP/.empty"
  echo "[DONE] 无需修复；已建空快照标记，rollback 为无操作。"
  exit 0
fi

# ---- Step 4: 删除旧副本 ----
echo "[REMOVE] 删除旧 dsh-llm @0.0.1-rc.1 ..."
rm -rf "$SLLM"
echo "[REMOVE] 删除旧 dsh-settings @0.0.1-rc.1 ..."
rm -rf "$SSET"

# ---- Step 5: 尽力验证解析（node 不在 PATH 则跳过） ----
if command -v node >/dev/null 2>&1; then
  echo "[VERIFY] @changfenhuang/dsh-genui 解析到的 dsh-llm："
  node -e "try{console.log(require.resolve('@deepseek-ai/dsh-llm',{paths:['E:/work/dsh-desktop-me/data/profiles/web/node_modules/@changfenhuang/dsh-genui']}))}catch(e){console.log('resolve failed: '+e.message)}"
else
  echo "[SKIP] 当前终端无 node，跳过解析验证（可在 harness 重启后观察插件加载）。"
fi

echo "[DONE] apply 完成。模块解析现已落到宿主根 @0.1.2-alpha.1。"
echo "        如需撤销，执行 rollback.sh。"
