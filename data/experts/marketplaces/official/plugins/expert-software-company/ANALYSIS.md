# 软件开发团队（Software Company）Agent Preset 分析

> 对象：`data/experts/marketplaces/official/plugins/expert-software-company`
> 类型：DSH 专家包，`expertType: "team"`，`dsh.baseline: "standard"`
> 机制：基于 harness 的 **Agent Team** 多智能体协作（TeamCreate + spawn + SendMessage 中转）

---

## 1. 这是什么

一个把"软件研发全流程"封装成一支虚拟团队的 **agent preset（专家/团队包）**。它不自己写代码，而是由一个主理人协调 4 个职能 agent，按 SOP 顺序流转，把"代码 = SOP(团队)"作为核心理念。

配套目录：
- `plugin.json`：包的元数据、成员名单、默认提示、标签、baseline
- `agents/software-team-lead.md`：主理人（编排者）prompt
- `agents/software-{product-manager,architect,engineer,qa-engineer}.md`：4 个职能 agent prompt
- `avatars/*.png`：5 个角色头像

---

## 2. 团队构成（5 个角色）

| Agent ID | 中文名 | 英文名(self) | 角色 | 核心职责 |
|---|---|---|---|---|
| `software-team-lead` | 齐活林 | Qi（文档内亦称"主理人"） | 交付总监 | 创建团队、路由判断、分派任务、汇总中转、质量关卡 |
| `software-product-manager` | 许清楚 | Alice | 产品经理 | 输出 PRD（简单/完整两档）+ 市场/竞品调研 |
| `software-architect` | 高见远 | Bob | 架构师 | 系统设计（类图/时序图/文件清单）+ **任务分解**（≤5 任务，按依赖排序） |
| `software-engineer` | 寇豆码 | Alex | 工程师 | 一次性批量写码、全局一致性审查（IS_PASS） |
| `software-qa-engineer` | 严过关 | Edward | QA 工程师 | 写测试、智能路由判定（Engineer/QA/NoOne）、≤2 轮 |

**默认技术栈**：Vite + React + MUI + Tailwind CSS（前端）；Python（FastAPI/Flask）+ SQLite（后端原型）。

---

## 3. 协作机制（铁律）

- **TeamCreate 只能由主理人执行**，严禁委派成员创建团队。
- **主理人中转（hub-spoke）**：所有跨成员信息流必须经主理人，成员之间不得直连；成员产出回传给主理人，由其转交下一阶段。
- **成员结论为准**：PRD/架构/代码/测试必须由对应成员输出后才采信，主理人只做编排与汇编，不得代写。
- **回传机制**：每个成员 spawn 后，通过 `SendMessage` 把结构化产出完整回传给主理人，收到 `shutdown_request` 后退出。

---

## 4. 工作流路由（核心设计亮点）

收到请求时主理人**首先判型**，再决定走哪条路径：

| 场景 | 判定条件 | 路径 |
|---|---|---|
| 小型需求 | 单页应用/小游戏/工具脚本/≤10 源文件 | ⚡ 快速模式 |
| Bug 修复 | 用户报告明确 Bug（非新功能） | 🔧 BugFix |
| 中大型需求 | 多页面/多模块/前后端/ >10 源文件 | 🏗️ 标准 SOP |
| 仅需分析 | 仅 PRD/架构评审/市场调研 | 📋 部分工作流 |

- **快速模式**：`TeamCreate → 工程师(直接全部代码) → QA(验证)`，跳过 PRD 与架构。
- **标准 SOP**：`PM(PRD) → 架构师(设计+拆任务) → 工程师(码) → QA(测)`，顺序流转。
- **BugFix**：`工程师(定位+修复) → QA(回归)`。
- **部分工作流**：可只调用单个成员（仅 PRD / 仅架构 / 仅测试 / 市场调研）。
- **关键原则**："宁选快速模式，不选过重流程——大多数用户需求应走快速模式"。

质量关卡：工程师完成全部文件后必须 `IS_PASS: YES` 才交 QA；QA 每轮做智能路由判定，最多 2 轮，第 2 轮仍不过则标注遗留问题交付。

---

## 5. 设计亮点

1. **角色解耦 + 单一职责**：PM/架构/工程/QA 各管一段，避免"一个人又写需求又写码又测"的混乱。
2. **主理人 hub-spoke 拓扑**：强制中转解决了多 agent 互喷、上下文错乱的通病。
3. **工作流分级（快速/SOP/BugFix/部分）**：明确"抗过度流程"，是对"agent 团建即灾难"的有效克制。
4. **质量关卡闭环**：IS_PASS 全局一致性审查 + QA 智能路由（源码 bug→工程，测试 bug→QA 自修）+ 轮次上限，既保证质量又防无限循环。
5. **结构化产出**：统一要求 Mermaid（类图/时序图/象限图）、表格、JSON schema，文档化每一步。
6. **增量开发支持**：在已有项目上变更时，各成员按"旧产物 + 增量"模式最小化改动。

---

## 6. 潜在问题与改进建议

1. **身份命名不一致（最显眼）**
   - `plugin.json` 中文名：齐活林 / 许清楚 / 高见远 / 寇豆码 / 严过关。
   - 但各 agent md 内部 `self-identity` 是英文 **Alice / Bob / Alex / Edward**，主理人 md 又自称"主理人齐活林(Qi)"。
   - 用户看到中文名，agent 内部自称英文，跨成员上下文会出现"许清楚 vs Alice"混用，**建议统一成一套命名**（优先用中文名，或明确"对外中文名 / 对内代号"）。

2. **"主理人" vs "Team Lead / Delivery Director" 术语漂移**
   - 主理人 md 多处写成"主理人（主理人）"括号重复，且 `description` 用 Delivery Director。
   - 各成员 md 的"团队协作"段是**逐字复制**的模板（连"你是...主理人（主理人）"都照抄），建议抽成共享片段，避免复制漂移。

3. **快速模式与工程师 Input 自相矛盾**
   - 主理人快速模式：**跳过架构师**，工程师直接实现。
   - 但 `software-engineer.md` 的 Input 段写明"会收到 Architect 的 system design（类图/接口），并须**严格遵循架构师的类图/接口定义**"。
   - 快速模式下没有架构产出，工程师这段 Input 会落空。**建议**工程师 md 增加"无 system design 时（快速模式）按需求直接实现"的分支说明。

4. **强依赖 harness 的 Agent Team 实现，但 preset 本身只定义 prompt**
   - 真正 spawn/TeamCreate/SendMessage 的能力来自 harness（本仓库含 `@wowyuarm/dsh-agent-team` 等实现包）。expert preset 只是 prompt 层，**需确认 expert 加载机制如何把这 5 个 agent 注册为可 spawn 的 teammate**（是否有 cordis patch / 入口声明——当前 `plugin.json` 只有 `dsh.baseline: standard`，未见 team 注册入口）。

5. **默认技术栈硬编码**
   - Vite+React+MUI+Tailwind 写死在前端默认；对非前端需求（纯后端服务、数据工程、嵌入式）不友好。后端默认 Python，但 Node/Go/Rust 场景未覆盖。**建议**把默认栈改为"按需求推断 + 用户可覆盖"。

6. **QA 2 轮硬上限是取舍**
   - 明确"2 轮是硬上限，剩余 edge case 标注为 Known Issues 而非死循环"——对交付速度有利，但关键路径 bug 可能被放过。**建议在标准 SOP 中允许高优 P0 模块突破 2 轮**。

7. **文档落盘默认关闭但路径硬编码**
   - 仅用户明确要求才落盘到 `deliverables/software-company/<项目简称>-delivery-<日期>.md`，但路径未参数化，跨平台/自定义项目目录时可能不太友好。

8. **中英文混排**
   - 主理人全中文，其余 agent 内部 self-identity 英文，规则又要求"与用户语言一致"。若用户用中文，工程师却以英文自称 Alex 并在内部推理用英文，可能造成一致性摩擦（不影响功能，但影响可读性与可审计性）。

---

## 7. 小结

这是一个**结构成熟、刻意克制过度流程**的研发团队 preset：以主理人为 hub 中转、4 职能清晰解耦、工作流按需求规模分级、并用质量关卡闭环保证交付。最大的可打磨点是**角色身份命名不统一**（中文名 / 英文 self / "主理人"术语三者漂移）以及**快速模式与工程师 prompt 的内部矛盾**。修复这两点，配合确认 harness 端 team 注册入口，就能更稳地落地。
