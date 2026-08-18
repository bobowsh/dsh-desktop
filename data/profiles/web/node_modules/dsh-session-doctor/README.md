# dsh-session-doctor · 会话医生

[English](./README.en.md) | 中文

> 诊断、解卡、读取 DeepSeek Harness 会话的插件。给每个会话装上五个工具,让你能查看、诊断、恢复、指挥其他 Agent 会话。

## 这是什么

在 DeepSeek Harness 里,一个进程会同时挂着多个 Agent 会话。一个会话可能卡死——比如 `cordis_inspect_query` 之类的 Client 平台查询永远等不到页面响应,agent 停在 `running` 状态,后续消息全部积压在 inbox 不被处理。本插件提供:

- **列出所有会话**:标题、id、在线状态、agent 运行状态(`running`/`idle`)、排队消息数、工作目录;
- **读取任意会话的对话记录**:用户与助手消息按时间顺序返回,附带标题与 live 状态;
- **诊断会话是否卡死**:查看 agent 是否在线、`running`/`idle`、inbox 排队数、最后事件;
- **解卡卡死的会话**:对 `running` 的 agent 发送取消信号(`keepInbox: true`),中止卡住的活动但保留 inbox 排队消息,agent 回到 idle 后自动处理排队消息;
- **向其他会话发送消息**:目标在线直接投递;仅持久化时自动恢复后投递。

典型场景:发现另一个会话卡住不动 → 诊断确认 → 解卡恢复 → 查看它后续的进展 → 必要时发消息指挥它继续。

## 功能

| 能力 | 说明 |
|------|------|
| `list_sessions` | 列出所有会话:id、标题、工作目录、持久化状态、**agent 运行状态**、排队消息数 |
| `read_session` | 读取指定会话的对话记录(用户/助手文本消息),按序返回,支持 `limit` |
| `session_status` | 诊断目标会话:是否在线、`running`/`idle`、inbox 排队数、最后事件 |
| `session_recover` | **解卡**:对卡死的 `running` agent 发取消信号(`keepInbox: true`),中止卡住的活动、保留排队消息 |
| `send_session_message` | 向目标会话发消息:在线直接投递;仅持久化自动恢复后投递 |

## 安装

### 方式一:一行命令

```sh
dsh plugin --profile web add dsh-session-doctor
```

### 方式二:从 GitHub 安装

```sh
dsh plugin --profile web add github:mayf3/dsh-session-doctor
```

### 方式三:直接发给你的 Agent

打开任意一个 DSH 会话,把下面这句话发给它:

> 帮我安装会话医生插件,执行:`dsh plugin --profile web add dsh-session-doctor`

装完自动挂载,所有会话立即获得上述五个工具。

## 使用

1. 对会话 A 说「列出所有会话」——它调 `list_sessions`,你可以看到每个会话的标题和运行状态;
2. 怀疑某个会话卡住 → 说「检查会话 `<id>` 的状态」——它调 `session_status`,返回 `status: running` 且长时间无进展即确认卡死;
3. 说「解卡会话 `<id>`」——它调 `session_recover`,卡住的活动被中止,排队消息在 agent 回到 idle 后继续处理;
4. 说「看看会话 `<id>` 最近在做什么」——它调 `read_session`,返回该会话的对话记录;
5. 说「给会话 `<id>` 发消息:……」——它调 `send_session_message`,对方在线立即送达、离线自动恢复后投递。

## 原理

- **诊断**:`sessionQuery.listSessions()` 列出完整逻辑语料,`ctx.agents.get(id)` 读取 live agent 的 `status` 与 `inbox` 排队数,`sessionQuery.listEvents(id)` 取最后事件作为进展证据;
- **解卡**:live agent 若 `status === 'running'`,调用 `agent.cancel({ kind: 'user' }, { keepInbox: true })` —— 中止当前卡住的活动,但保留 inbox 排队消息;agent 收敛到 idle 后,排队消息会被自动处理;
- **读取**:`sessionQuery.readSession(id)` 重放完整会话日志,提取 `user/message` 与 `assistant/message` 的文本块;
- **发送**:在线 → `agents.get(id)` 后 `followup()`;离线 → `agentLoop.resume()` 恢复会话再投递。

## 与 dsh-agent-message 的关系

[dsh-agent-message](https://github.com/GengDaPeng/dsh-agent-message) 专注**跨会话消息收发**(五种投递模式、回执、会话导航);本插件专注**会话健康**(诊断、解卡、读取记录),并提供一个简单的消息投递入口。两者可以共存:消息收发用 agent-message,卡住了解卡用 session-doctor。

## 目录结构

```
dsh-session-doctor/
├── lib/
│   └── index.js      # host 半区:五个工具
├── cordis.patch.yml  # 自注册补丁(dsh.bundle.patch 指向它)
├── package.json      # DSH 插件清单(dsh.bundle / dshx.contributes)
├── README.md         # 中文文档
└── README.en.md      # English documentation
```

## 限制

- `session_recover` 只作用于 live agent(`running` 状态);离线会话不存在卡住的活动,无需解卡。
- `send_session_message` 的离线恢复以默认模型启动目标会话(不继承它上次手动切换的模型选择)。
- 跨进程/跨机器通信不在本插件范围内。

## License

[MIT](./LICENSE)
