# workbuddy-hero

把 DSH Web GUI 的欢迎页（hero）换成 WorkBuddy 风格：大标题「WorkBuddy, 我帮你」+ 场景分段切换（日常办公 / 代码开发 / 设计创意）+ 快捷起步 chips + 输入框右上角宇航员吉祥物 + WorkBuddy 版占位文案。

纯 client 插件：只通过 `conversation.hero.brand.mark` / `conversation.hero.modeActions` 两个 slot 注入，不修改任何 `@deepseek-ai/*` 包本体，禁用/卸载即恢复原样。

## 安装（本仓库打包流程）

源码在本仓库 `packages/workbuddy-hero/`，以 file: 依赖装入 web profile：

```powershell
cd data/profiles/web
pnpm add file:../../../packages/workbuddy-hero
```

然后在 `data/profiles/web/cordis.patch.yml` 的 `insert:` 列表加一行：

```yaml
- insert:
  - id: workbuddy-hero
    name: workbuddy-hero
```

重启 GUI（或等 patchReload: live 重载插件树）后刷新页面生效。

## 实现要点

- **brand.mark 占位**：官方构建不给 `conversation.hero.brand.mark` 注册任何条目（鱼是 fallback），本插件注册后即可接管 hero 区域：隐藏原 headline（鱼 + 「探索未至之境」+ 预览版徽标），把欢迎块 portal 到 headline 下方的空 body div（DOM 结构向上爬，不依赖 CSS hash 类名）。
- **chips 填稿**：`conversation.hero.modeActions` 是 list 型 session 级 slot，条目组件能拿到 `uiSession` 共享的 `inputActions`（含 `setDraft`）。本插件挂了一个渲染 null 的桥条目，把 `inputActions` 存到模块级 store；hero 块点击 chip 时调用 `setDraft(prompt)` 并聚焦编辑器。
- **宇航员**：从目标设计稿裁剪 115x102 PNG（边缘泛洪去白底），base64 内嵌进 client.js，以绝对定位挂到 `[data-composer-card]` 右上角。
- **占位文案**：locale 字典同名命名空间不可重复注册，故用 CSS 把 `[data-composer-placeholder]` 原文字隐藏（font-size:0）并用 `::after` 输出 WorkBuddy 文案；workspace 未选态（cardWorkspaceTrigger）恢复原文案。
- **主题适配**：全部使用 `--dsw-*` 变量，深色模式下 active 分段自动变白底深字。

## 已知取舍

- 无会话（未选工作区）时 chips 可点击但无处落稿（composer 本来就是 inert 的）。
- 占位文案全局替换（包括会话中空稿状态），plan 模式等特殊占位也会显示 WorkBuddy 文案。
