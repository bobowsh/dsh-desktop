# 项目脚手架方法论

> Spec 流水线第四阶段（任务执行）使用。在 tasks.md 的第一个编码任务开始前，按本文档初始化项目结构。

## 启动校验

进入本阶段时，`.specs/<feature>/tasks.md` 必须存在且非空。若缺失或为空，回退到编码任务规划阶段。

## 脚手架流程

### 1. 读取 tasks.md

解析任务清单，提取：
- **目标技术栈**（语言、框架、包管理器）
- **入口文件**（main / index / app）
- **测试框架**（vitest / jest / mocha / pytest 等）
- **构建工具**（vite / webpack / tsc / esbuild 等）

### 2. 初始化项目根目录

```bash
# 在当前工作区下创建项目目录
mkdir -p <project-root>
cd <project-root>
```

根据技术栈选择模板：

| 技术栈 | 包管理器 | 初始化命令 |
|--------|---------|-----------|
| Node.js/TypeScript | pnpm | `pnpm init` + 手写 tsconfig.json |
| Node.js/TypeScript | npm | `npm init -y` + 手写 tsconfig.json |
| React + Vite | pnpm | `pnpm create vite . --template react-ts` |
| Python | pip | `touch requirements.txt` + 手写 pyproject.toml |

### 3. 创建目录结构

通用结构（按需裁剪）：

```
<project-root>/
├── src/                    # 源代码
│   ├── index.ts            # 入口
│   └── ...                 # 按 tasks.md 拆分的模块
├── tests/                  # 测试
│   └── ...                 # 每个任务对应一个测试文件
├── .specs/<feature>/       # Spec 文档（已存在）
│   ├── spec.md
│   ├── design.md
│   └── tasks.md
├── package.json            # 或 pyproject.toml
├── tsconfig.json           # TypeScript 项目
├── .gitignore
└── README.md
```

### 4. 写入基础配置

**package.json**（Node.js 项目）：
- `name`: 从 feature 名派生（kebab-case）
- `type`: `"module"`
- `scripts.test`: 指向测试框架
- `scripts.build`: 指向构建工具

**tsconfig.json**（TypeScript 项目）：
- `target`: `"ES2022"`
- `module`: `"NodeNext"`
- `moduleResolution`: `"NodeNext"`
- `strict`: `true`
- `outDir`: `"dist"`
- `rootDir`: `"src"`

**.gitignore**：
```
node_modules/
dist/
.env
*.log
```

### 5. 安装依赖

```bash
# 根据 design.md 的依赖清单安装
pnpm add <runtime-deps>
pnpm add -D <dev-deps>
```

### 6. 验证脚手架

```bash
# 确保项目可编译/可运行
pnpm test    # 或 npm test
pnpm build   # 或 npm run build
```

若验证失败，修复后重试。不进入编码任务前，脚手架必须通过验证。

## 边界

- 脚手架只创建**空壳**文件和配置，不写业务逻辑。
- 已存在的文件不覆盖（幂等）。
- 若 tasks.md 指定了特定的项目结构，以 tasks.md 为准，本文档为兜底。
- 脚手架完成后，向用户简要汇报创建了哪些文件和目录，然后开始执行第一个编码任务。
