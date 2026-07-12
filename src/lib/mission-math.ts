// Чистая математика миссий: оценка ног и P&L выбора на пути сценария.
// Вынесена из Mission.tsx, чтобы её могли использовать контент-линт и Монте-Карло.
import { bs, daysToYears, payoffAtExpiry, type OptType } from './bs'
import { gbmPath } from './rng'
import type { Mission, MissionChoice } from '../content/types'

export interface PricedLeg {
  type: OptType
  side: 1 | -1
  strike: number
  qty: number
  premium: number
  dte: number
}

/** Оценивает ноги выбора по условиям входа миссии (спот и IV на старте) */
export function priceLegs(m: Mission, c: MissionChoice): PricedLeg[] {
  return c.legs.map(l => ({
    ...l,
    dte: l.dte ?? m.dte,
    premium: bs(l.type, m.spot, l.strike, m.iv / 100, daysToYears(l.dte ?? m.dte)).price,
  }))
}

/**
 * P&L выбора при споте S в день day сценария.
 * IV линейно интерполируется от m.iv к m.ivEnd (если задана) по ходу сценария.
 */
export function pnlAt(
  m: Mission,
  c: MissionChoice,
  legs: PricedLeg[],
  S: number,
  day: number,
): number {
  const ivEnd = m.ivEnd ?? m.iv
  const ivNow = (m.iv + ((ivEnd - m.iv) * day) / m.days) / 100
  let pnl = 0
  for (const leg of legs) {
    const left = leg.dte - day
    const value =
      left <= 0
        ? payoffAtExpiry(leg.type, S, leg.strike)
        : bs(leg.type, S, leg.strike, ivNow, daysToYears(left)).price
    pnl += leg.side * leg.qty * (value - leg.premium)
  }
  if (c.spotQty) pnl += c.spotQty * (S - m.spot)
  return pnl
}

/** Выбор с умноженным размером позиции (ноги и спот); премии за контракт не меняются */
export function scaleChoice(c: MissionChoice, k: number): MissionChoice {
  if (k === 1) return c
  return {
    ...c,
    legs: c.legs.map(l => ({ ...l, qty: l.qty * k })),
    spotQty: c.spotQty ? c.spotQty * k : undefined,
  }
}

/**
 * Финальные P&L выбора на n альтернативных путях того же сценария.
 * Шок (shockDay/shockPct) сохраняется во всех вселенных: он — часть предпосылки
 * сценария, случайность — всё остальное. Только для seeded-миссий.
 */
export function mcOutcomes(m: Mission, c: MissionChoice, n: number): number[] {
  if ('fixed' in m.path) throw new Error('Монте-Карло только для seeded-путей')
  const legs = priceLegs(m, c) // вход одинаков во всех вселенных
  const out: number[] = []
  for (let i = 1; i <= n; i++) {
    const path = gbmPath({
      seed: m.path.seed + i,
      spot: m.spot,
      days: m.days,
      vol: m.path.vol,
      drift: m.path.drift,
      shockDay: m.path.shockDay,
      shockPct: m.path.shockPct,
    })
    out.push(pnlAt(m, c, legs, path[m.days], m.days))
  }
  return out
}

export interface McStats {
  probProfit: number
  median: number
  p5: number
  p95: number
}

export function mcStats(outcomes: number[]): McStats {
  const sorted = [...outcomes].sort((a, b) => a - b)
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]
  return {
    probProfit: outcomes.filter(x => x > 0).length / outcomes.length,
    median: q(0.5),
    p5: q(0.05),
    p95: q(0.95),
  }
}
