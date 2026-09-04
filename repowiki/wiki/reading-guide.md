---

type: Concept
title: "阅读指南"
generated: { by: codewiki/reading_guide.py, at: 2026-08-30T15:15:54Z }
stale_after: 2099-12-31
description: "> 基于 PageRank 依赖分析自动生成。排名越靠前的组件被越多模块依赖，建议优先阅读。"

---

# 阅读指南

> 基于 PageRank 依赖分析自动生成。排名越靠前的组件被越多模块依赖，建议优先阅读。
> 排序依据为 PageRank 得分（综合考虑被依赖数量及依赖方自身的重要性），
> 表中「直接被依赖数」列为原始入度，仅供参考。

## 推荐阅读顺序

| #   | 组件                            | 类型        | 所属模块             | 直接被依赖数 | PageRank | 文件                                             |
| --- | ----------------------------- | --------- | ---------------- | ------ | -------- | ---------------------------------------------- |
| 1   | `HarnessRuntime.note`         | function  | harness-runtime  | 21     | 0.0076   | src\main\runtime\harness-runtime.ts            |
| 2   | `profilePackageJsonPath`      | function  | profile-state    | 15     | 0.0074   | src\main\state\plugin-recovery.ts              |
| 3   | `profileDir`                  | function  | profile-state    | 13     | 0.0064   | src\main\state\generation-migration.ts         |
| 4   | `LaunchAgentRecord`           | interface | profile-state    | 11     | 0.0055   | src\main\state\launch-agent-audit.ts           |
| 5   | `UpdateStatus`                | interface | shared-contracts | 13     | 0.0050   | src\shared\contracts.ts                        |
| 6   | `UtilityProcessAdapter.kill`  | function  | harness-runtime  | 6      | 0.0033   | src\main\runtime\disclaimed-utility-process.ts |
| 7   | `isRecord`                    | function  | mobile-bridge    | 5      | 0.0032   | src\main\mobile\lan-mobile-bridge.ts           |
| 8   | `harnessLocale`               | function  | app-bootstrap    | 11     | 0.0031   | src\main\index.ts                              |
| 9   | `ProfilePluginCommandOptions` | interface | harness-runtime  | 5      | 0.0030   | src\main\runtime\profile-plugin-command.ts     |
| 10  | `latestHarnessAttemptLogs`    | function  | harness-runtime  | 5      | 0.0029   | src\main\runtime\harness-runtime.ts            |
| 11  | `LaunchctlCommandResult`      | interface | profile-state    | 7      | 0.0028   | src\main\state\launchctl-service-state.ts      |
| 12  | `HarnessRuntime.snapshot`     | function  | harness-runtime  | 11     | 0.0028   | src\main\runtime\harness-runtime.ts            |
| 13  | `readManifest`                | function  | profile-state    | 6      | 0.0027   | src\main\state\profile-compatibility.ts        |
| 14  | `transition`                  | function  | auto-update      | 7      | 0.0027   | src\main\update\update-manager.ts              |
| 15  | `GpuFallbackState`            | interface | window-shell     | 7      | 0.0025   | src\main\gpu-fallback.ts                       |
| 16  | `Note`                        | type      | profile-state    | 5      | 0.0025   | src\main\state\generation-migration.ts         |
| 17  | `ComponentLedgerEntry`        | interface | profile-state    | 3      | 0.0023   | src\main\state\component-ledger.ts             |
| 18  | `PluginRecoveryLocale`        | type      | recovery-views   | 3      | 0.0023   | src\main\plugin-recovery-view.ts               |
| 19  | `PendingMobileQuestion`       | interface | mobile-bridge    | 4      | 0.0022   | src\main\mobile\lan-mobile-bridge.ts           |
| 20  | `ProfileCompatibilityIssue`   | interface | profile-state    | 5      | 0.0022   | src\main\state\profile-compatibility.ts        |

## 模块重要性排名

| #   | 模块                 | 累计 PageRank |
| --- | ------------------ | ----------- |
| 1   | profile-state      | 0.1563      |
| 2   | mobile-bridge      | 0.0667      |
| 3   | harness-runtime    | 0.0575      |
| 4   | app-bootstrap      | 0.0567      |
| 5   | desktop-extensions | 0.0325      |
| 6   | window-shell       | 0.0285      |
| 7   | preload-ui         | 0.0225      |
| 8   | auto-update        | 0.0218      |
| 9   | recovery-views     | 0.0172      |
| 10  | shared-contracts   | 0.0118      |

---

*基于 593 个组件、971 条依赖边计算。*