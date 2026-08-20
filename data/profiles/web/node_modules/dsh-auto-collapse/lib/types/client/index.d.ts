/**
 * dsh-auto-collapse — browser half 类型声明。
 *
 * 折叠会话里的工具卡片与 Think 推理块；把官方 "Deep diving..." 运行状态行
 * 替换为 "Deep sleeping..."（特效不变）。
 */

/** 客户端根上下文的最小结构化类型（仅用 cordis 标准 effect）。 */
export interface FoldClientCtx {
  effect(fn: () => unknown, label?: string): unknown
}

export const name: string
export const inject: string[]
export function apply(ctx: FoldClientCtx): void
