# dsh-desktop-me 项目约定

## Harness 默认 home 目录（2026-08-16 改回 `~/.dsh`）
- 桌面壳（DSH Desktop）曾把 harness 用户数据根目录从默认 `~/.dsh` 改写为 `<userData>/harness`（生产：`dsh-desktop/harness`，开发：`dsh-desktop-dev/harness`），原因见 `src/main/index.ts` 注释：保持跨品牌升级时目录稳定。
- 2026-08-16 让 harness 回归默认 `~/.dsh`：
  - 仅 `src/main/runtime/harness-runtime.ts` 移除注入给 harness 子进程的 `DSH_HOME` 环境变量；harness 自行 `resolveDshHome()` 默认 `~/.dsh`。
  - `src/main/index.ts` 的 `dshHome` 保持原值 `join(app.getPath('userData'), 'harness')` 不动（用户要求保留）；因此桌面壳仍会 `mkdir` 一个无用的 `userData/harness` 空目录，实际 harness 数据落在 `~/.dsh`。
- `launch-root`（harness 启动 cwd）仍在 `userData` 下，与 `.dsh` 是两回事，未动。
- `buildHarnessSpawnOptions` 的 `dshHome` 形参在去掉注入后已无引用；tsconfig 未开 `noUnusedParameters`，不报错（可选清理：删参数+调用处传参）。
