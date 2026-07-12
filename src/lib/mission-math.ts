// Чистая математика миссий: оценка ног и P&L выбора на пути сценария.
// Вынесена из Mission.tsx, чтобы её могли использовать контент-линт и Монте-Карло.
import { bs, daysToYears, payoffAtExpiry, type OptType } from './bs'
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
