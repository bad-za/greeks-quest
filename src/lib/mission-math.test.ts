import { describe, it, expect } from 'vitest'
import { priceLegs, pnlAt, scaleChoice, mcOutcomes, mcStats } from './mission-math'
import { payoffAtExpiry } from './bs'
import type { Mission, MissionChoice } from '../content/types'

function mission(over: Partial<Mission> = {}): Mission {
  return {
    id: 'test',
    title: 'test',
    brief: null,
    spot: 100_000,
    iv: 60,
    dte: 30,
    days: 30,
    path: { seed: 1, vol: 0.6, drift: 0 },
    choices: [],
    debrief: null,
    ...over,
  }
}

function choice(over: Partial<MissionChoice>): MissionChoice {
  return { label: '', desc: '', legs: [], verdict: 'ok', debrief: '', ...over }
}

const longCall = choice({ legs: [{ type: 'call', side: 1, strike: 105_000, qty: 1 }] })
const shortPut = choice({ legs: [{ type: 'put', side: -1, strike: 95_000, qty: 0.5 }] })
const coveredCall = choice({
  legs: [{ type: 'call', side: -1, strike: 110_000, qty: 0.1 }],
  spotQty: 0.1,
})

describe('priceLegs', () => {
  it('премии конечны и положительны, dte наследуется от миссии', () => {
    const m = mission()
    for (const c of [longCall, shortPut, coveredCall]) {
      for (const leg of priceLegs(m, c)) {
        expect(Number.isFinite(leg.premium)).toBe(true)
        expect(leg.premium).toBeGreaterThan(0)
        expect(leg.dte).toBe(30)
      }
    }
  })
})

describe('pnlAt', () => {
  it('день 0 при неизменном споте → P&L = 0 (позиция открыта по текущим ценам)', () => {
    const m = mission()
    for (const c of [longCall, shortPut, coveredCall]) {
      expect(pnlAt(m, c, priceLegs(m, c), m.spot, 0)).toBeCloseTo(0, 6)
    }
  })

  it('день 0 → P&L = 0 даже при заданном ivEnd (интерполяция стартует с iv)', () => {
    const m = mission({ ivEnd: 40 })
    expect(pnlAt(m, longCall, priceLegs(m, longCall), m.spot, 0)).toBeCloseTo(0, 6)
  })

  it('на экспирации стоимость ноги равна payoff', () => {
    const m = mission()
    const legs = priceLegs(m, longCall)
    const S = 120_000
    const expected = payoffAtExpiry('call', S, 105_000) - legs[0].premium
    expect(pnlAt(m, longCall, legs, S, 30)).toBeCloseTo(expected, 9)
  })

  it('spotQty даёт линейный P&L по движению цены', () => {
    const m = mission()
    const spotOnly = choice({ spotQty: 0.2 })
    expect(pnlAt(m, spotOnly, [], 110_000, 15)).toBeCloseTo(0.2 * 10_000, 9)
  })
})

describe('scaleChoice', () => {
  it('умножает qty ног и spotQty; ×1 возвращает исходный объект', () => {
    const c = choice({ legs: [{ type: 'call', side: 1, strike: 105_000, qty: 0.4 }], spotQty: 0.2 })
    const doubled = scaleChoice(c, 2)
    expect(doubled.legs[0].qty).toBe(0.8)
    expect(doubled.spotQty).toBe(0.4)
    expect(scaleChoice(c, 1)).toBe(c)
  })

  it('P&L масштабируется линейно вместе с размером', () => {
    const m = mission()
    const half = scaleChoice(longCall, 0.5)
    const pnl1 = pnlAt(m, longCall, priceLegs(m, longCall), 120_000, 30)
    const pnl05 = pnlAt(m, half, priceLegs(m, half), 120_000, 30)
    expect(pnl05).toBeCloseTo(pnl1 / 2, 9)
  })
})

describe('mcOutcomes / mcStats', () => {
  it('детерминирован, длина n, значения конечны', () => {
    const m = mission()
    const a = mcOutcomes(m, longCall, 200)
    const b = mcOutcomes(m, longCall, 200)
    expect(a).toEqual(b)
    expect(a).toHaveLength(200)
    for (const x of a) expect(Number.isFinite(x)).toBe(true)
  })

  it('кидает на fixed-путях (исторические миссии — вне Монте-Карло)', () => {
    const m = mission({ path: { fixed: Array(31).fill(100_000) } })
    expect(() => mcOutcomes(m, longCall, 10)).toThrow()
  })

  it('лонг-колл: сильный плюс-дрейф даёт больше P(профит), чем минус-дрейф', () => {
    const up = mcStats(mcOutcomes(mission({ path: { seed: 7, vol: 0.5, drift: 2 } }), longCall, 500))
    const down = mcStats(
      mcOutcomes(mission({ path: { seed: 7, vol: 0.5, drift: -2 } }), longCall, 500),
    )
    expect(up.probProfit).toBeGreaterThan(down.probProfit)
    expect(up.median).toBeGreaterThan(down.median)
  })

  it('квантили упорядочены: p5 ≤ медиана ≤ p95', () => {
    const s = mcStats(mcOutcomes(mission(), longCall, 500))
    expect(s.p5).toBeLessThanOrEqual(s.median)
    expect(s.median).toBeLessThanOrEqual(s.p95)
  })
})
