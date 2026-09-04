# dsh-quadrant-board

DeepSeek Harness 插件：把「任务与知识看板」装进 DSH Web GUI 的**会话标签页**（与 记忆系统 / iDesign 同一排 tab）。

- **四象限任务看板**：标题 / 截止时间 / 标签 / 备注，卡片拖拽换象限，完成自动按月归档
- **随手记**：每周一个 Markdown 文件（`notes/YYYY-Www.md`），Ctrl+Enter 快存，行内编辑 / 删除 / 预览
- **快捷区**：软件 / 文件夹 / 网页一键打开（宿主进程 `rundll32 FileProtocolHandler`），支持上传自定义图标
- **6 磁贴自由布局**：列数 1–6、拖拽换位、跨列微调，记忆在浏览器 localStorage

## 结构

| 部分 | 说明 |
|---|---|
| `lib/index.js` | 主机半：纯 Node.js 后端（原 Python server.py 的等价移植，零依赖），挂在 webServer `/taskboard` 前缀路由 |
| `lib/client.js` | 客户端半：在 `conversation.view` 槽位注册「任务看板」标签页（同源 iframe，主题跟随 GUI） |
| `static/` | 原生前端（原生 HTML/CSS/JS，路径已适配 `/taskboard/` 前缀） |

## 数据

默认数据目录 = `<DSH_HOME>/taskboard`；`cordis.patch.yml` 的 `config.dataDir` 可指向任意目录
（当前指向 `E:\work\aitest\taskboard`，直接复用原单机版数据）。布局与原版一致：
`data/tasks.json`、`data/shortcuts.json`、`data/icons/`、`notes/YYYY-Www.md`、`archive/YYYY-MM.md`。

## 配置（cordis.patch.yml）

| 键 | 默认 | 说明 |
|---|---|---|
| `dataDir` | `<DSH_HOME>/taskboard` | 数据根目录（含 data/ notes/ archive/ 子结构） |
| `openShortcuts` | `true` | 是否允许快捷区在本机打开目标（安全开关） |
| `maxBodyBytes` | 4MB | 请求体上限 |
| `maxIconBytes` | 1MB | 图标上传上限 |

安装后需**重启 DSH**生效（主机侧插件无 HMR）。
