import { describe, it, expect } from 'vitest'
import { priceLegs, pnlAt } from './mission-math'
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
