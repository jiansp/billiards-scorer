// 台球追分（九球追分）计分逻辑
// 核心关系：当前击球人 = 本家；逆时针上一人为 上家；下一人为 下家。
// 两人模式下 上家 === 下家（同一对手），"上下家各赔 X" 合并为对手赔 X。

export type EventType =
  | 'puSheng' // 普胜
  | 'xiaoJin' // 小金
  | 'daJin' // 大金
  | 'huangJinJiu' // 黄金九
  | 'heiJin' // 黑金
  | 'fanGui' // 犯规

export interface Rules {
  puSheng: number // 普胜：上家赔本家
  xiaoJin: number // 小金：上家赔本家
  daJin: number // 大金：上下家各赔本家（每人）
  huangJinJiu: number // 黄金九：上下家各赔本家（每人）
  heiJin: number // 黑金：本家赔上下家（每人）
  fanGui: number // 犯规：本家给上家
}

// 主流 "14710" 计分体系
export const DEFAULT_RULES: Rules = {
  puSheng: 4,
  xiaoJin: 7,
  daJin: 10,
  huangJinJiu: 4,
  heiJin: 10,
  fanGui: 1,
}

export const EVENT_LABELS: Record<EventType, string> = {
  puSheng: '普胜',
  xiaoJin: '小金',
  daJin: '大金',
  huangJinJiu: '黄金九',
  heiJin: '黑金',
  fanGui: '犯规',
}

export const EVENT_DESC: Record<EventType, string> = {
  puSheng: '接手后清台',
  xiaoJin: '开球未下·接杆清台',
  daJin: '开球有下·一杆清台',
  huangJinJiu: '开球/传进9号',
  heiJin: '清台母球落袋',
  fanGui: '失误/犯规',
}

export const EVENT_ORDER: EventType[] = [
  'puSheng',
  'xiaoJin',
  'daJin',
  'huangJinJiu',
  'heiJin',
  'fanGui',
]

export interface HistoryEntry {
  event: EventType
  shooter: number
  before: number[]
  after: number[]
}

// 应用一次得分事件，返回新的分数数组（不修改原数组）
// 上家 / 下家 由调用方显式指定（三人局里顺序不固定，每杆手动确定）
export function applyEvent(
  scores: number[],
  shooter: number,
  up: number,
  down: number,
  event: EventType,
  rules: Rules
): number[] {
  const next = scores.slice()
  const add = (i: number, v: number) => {
    next[i] += v
  }

  switch (event) {
    case 'puSheng':
      add(shooter, rules.puSheng)
      add(up, -rules.puSheng)
      break
    case 'xiaoJin':
      add(shooter, rules.xiaoJin)
      add(up, -rules.xiaoJin)
      break
    case 'daJin':
      if (up === down) {
        // 两人模式：对手赔一次
        add(shooter, rules.daJin)
        add(down, -rules.daJin)
      } else {
        add(shooter, 2 * rules.daJin)
        add(up, -rules.daJin)
        add(down, -rules.daJin)
      }
      break
    case 'huangJinJiu':
      if (up === down) {
        add(shooter, rules.huangJinJiu)
        add(down, -rules.huangJinJiu)
      } else {
        add(shooter, 2 * rules.huangJinJiu)
        add(up, -rules.huangJinJiu)
        add(down, -rules.huangJinJiu)
      }
      break
    case 'heiJin':
      if (up === down) {
        add(shooter, -rules.heiJin)
        add(down, rules.heiJin)
      } else {
        add(shooter, -2 * rules.heiJin)
        add(up, rules.heiJin)
        add(down, rules.heiJin)
      }
      break
    case 'fanGui':
      add(shooter, -rules.fanGui)
      add(up, rules.fanGui)
      break
  }
  return next
}
