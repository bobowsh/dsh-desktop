#!/usr/bin/env bash
# ============================================================================
#  DSH profile web 依赖修复 - rollback (bash)
#  作用：从 .dsh-dep-fix-snapshot 把 apply 删除的两份旧副本完整恢复。
#  幂等：可重复执行；无快照则提示无操作。
# ============================================================================
set -uo pipefail
PROFILE="E:/work/dsh-desktop-me/data/profiles/web"
NM="$PROFILE/node_modules/@deepseek-ai"
SNAP="E:/work/dsh-desktop-me/.dsh-dep-fix-snapshot"
SLLM="$NM/dsh-llm"
SSET="$NM/dsh-settings"

if [ ! -e "$SNAP" ]; then
  echo "[ABORT] 未找到快照 $SNAP，没有可回滚的内容。"
  exit 2
fi

# ---- 恢复 dsh-llm ----
if [ -d "$SNAP/dsh-llm" ]; then
  mkdir -p "$SLLM"
  cp -R "$SNAP/dsh-llm/." "$SLLM/"
  echo "[RESTORE] dsh-llm 已恢复。"
else
  echo "[INFO] 快照中无 dsh-llm（原就不存在）；确保已删除..."
  [ -d "$SLLM" ] && rm -rf "$SLLM"
fi

# ---- 恢复 dsh-settings ----
if [ -d "$SNAP/dsh-settings" ]; then
  mkdir -p "$SSET"
  cp -R "$SNAP/dsh-settings/." "$SSET/"
  echo "[RESTORE] dsh-settings 已恢复。"
else
  echo "[INFO] 快照中无 dsh-settings（原就不存在）；确保已删除..."
  [ -d "$SSET" ] && rm -rf "$SSET"
fi

echo "[DONE] rollback 完成，旧副本已还原。"
