---

title: "Preset Packages"
type: Module
description: "DSH Desktop 作为 `.dshpreset` 文件交换自定义 Agent preset。一个包是一个布局如下的 ZIP 归档："
generated: { by: codewiki/5.5.0, at: 2026-08-30T13:35:22Z }
stale_after: 2026-11-28
aliases: [preset-packages]
status: stable

---

# DSH Desktop preset 包文档

## 概览

DSH Desktop 作为 `.dshpreset` 文件交换自定义 Agent preset。一个包是一个布局如下的 ZIP 归档：

```
manifest.json
preset/
├── agent.cordis.yml
├── preset.yml            # 可选
└── skills, plugins, and other preset-owned assets
```

`manifest.json` 当前使用格式版本 1：

```json
{
  "format": "dsh-preset",
  "version": 1,
  "id": "my-agent",
  "name": "My agent",
  "description": "Optional display copy",
  "sourceDshVersion": "0.1.0-rc.7",
  "exportedAt": "2026-08-14T12:00:00.000Z"
}
```

## 导出

仅可导出自定义 preset。若应共享内置 preset，先复制之。模型提供者设置、API keys、credentials、sessions 与 workspace 文件不被 DSH Desktop 添加；仅包含 preset 目录内的文件。

### 导出 API

- `GET $DSH_WEB_URL/api/agent-preset.export?agentPreset=<id>` - 导出单个 Preset
- `$DSH_WEB_URL` 通过 shell tools � 노출为 `DSH_WEB_URL`

## 导入

导入为两步操作。DSH Desktop 首先验证并预览归档，然后在确认后写入。现有 preset 識别符**永不**被覆盖：用户必须选择新的识别符。

### 导入步骤

1. DSH Desktop 验证并预览归档
2. 用户确认后写入
3. 现有 preset 永不被覆盖 - 选择新标识符

### 导入 API

- `POST $DSH_WEB_URL/api/agent-preset.import` - 预览二进制包而不写入
- `POST $DSH_WEB_URL/api/agent-preset.import?agentPreset=<targetId>&install=1` - 有效的原子安装

## 安全注意事项

- 导入包仅从受信任来源
- 在 model context 中永不解码或直接 unpack archive 到 Preset root
- 直接覆盖现有识别符
  -审查关于可能的 credentials、absolute paths 与 DSH 版本差异的警告

## Agent 和在线 Skill 契约

DSH Desktop 通过相同的 loopback Harness server 导出 preset 传输，该 server 也被 UI 使用。Harness 贡献其规范的 loopback origin 到 shell tools 作为 `DSH_WEB_URL`，因此明确请求的在线 Skill 可以在不知道随机 port 的情况下调用本地 transfer API，也无需 `dash` CLI。

## 常见问题

- **模型上下文**：永不将 `.dshpreset` 存档 paste 或 decode 到 model context
- **路径遍历**：导入器拒绝 absolute archive paths、parent traversal、backslash-based paths
- **版本差异**：导入时检查 sourceDshVersion 与当前运行版本是否兼容