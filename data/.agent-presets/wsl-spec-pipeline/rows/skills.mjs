/**
 * spec-pipeline preset 的技能注册行。
 *
 * 从 preset 目录的 skills/ 读取三份方法论 Markdown，注册为 agent 作用域
 * 技能（模型可用 skill 工具按需加载）。注册走 ctx.skills.register()，
 * 随 preset 挂载生效、随会话销毁卸载。
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'spec-pipeline-skills'
export const inject = ['skills']

const here = dirname(fileURLToPath(import.meta.url))

/** 技能清单：注册名、描述、对应的 Markdown 文件。描述出现在模型的技能目录里。 */
const SKILL_FILES = [
  {
    name: 'spec-requirement',
    description:
      '需求规格写作方法论：原子场景七路径分解、what/how 分离、Assumptions/Blocking Questions 双通道、.trace 证据链。Spec 流水线第一阶段使用。',
    file: 'spec-requirement.md',
  },
  {
    name: 'spec-design',
    description:
      '实现方案设计方法论：基于 spec.md 产出 design.md，决策可回溯到场景、接口契约先行、最小方案原则。Spec 流水线第二阶段使用。',
    file: 'spec-design.md',
  },
  {
    name: 'spec-task',
    description:
      '编码任务规划方法论：基于 design.md 拆分可独立验证的 tasks.md 任务清单，显式依赖顺序与场景覆盖核对。Spec 流水线第三阶段使用。',
    file: 'spec-task.md',
  },
  {
    name: 'spec-scaffold',
    description:
      '项目脚手架方法论：任务执行阶段开始前，按技术栈初始化项目结构、配置文件和目录骨架。Spec 流水线第四阶段使用。',
    file: 'spec-scaffold.md',
  },
]

export function apply(ctx) {
  for (const def of SKILL_FILES) {
    const content = readFileSync(join(here, '..', 'skills', def.file), 'utf8')
    ctx.effect(
      () => ctx.skills.register({ name: def.name, description: def.description, content }),
      `spec-pipeline: skill ${def.name}`,
    )
  }
}
