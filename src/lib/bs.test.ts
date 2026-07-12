import { describe, it, expect } from 'vitest'
import { bs, cdf, daysToYears } from './bs'

const SPOTS = [60_000, 100_000, 150_000]
const STRIKES = [70_000, 105_000, 140_000]
const IVS = [0.3, 0.65, 1.2]
const DAYS = [1, 30, 180]

describe('cdf', () => {
  it('симметрия: cdf(-x) = 1 - cdf(x)', () => {
    for (const x of [-3, -1, 0.5, 2, 4]) {
      expect(cdf(-x)).toBeCloseTo(1 - cdf(x), 12)
    }
  })

  it('cdf(0) = 0.5 (в пределах точности аппроксимации ~7.5e-8)', () => {
    expect(cdf(0)).toBeCloseTo(0.5, 7)
  })

  it('монотонно растёт', () => {
    let prev = -1
    for (let x = -4; x <= 4; x += 0.25) {
      const v = cdf(x)
      expect(v).toBeGreaterThan(prev)
      prev = v
    }
  })

  it('референсные значения нормального распределения', () => {
    expect(cdf(1)).toBeCloseTo(0.841345, 5)
    expect(cdf(2)).toBeCloseTo(0.97725, 5)
    expect(cdf(-1.96)).toBeCloseTo(0.025, 4)
  })
})

describe('bs: пут-колл паритет (r = 0)', () => {
  it('C − P = S − K на сетке параметров', () => {
    for (const S of SPOTS)
      for (const K of STRIKES)
        for (const iv of IVS)
          for (const d of DAYS) {
            const t = daysToYears(d)
            const c = bs('call', S, K, iv, t).price
            const p = bs('put', S, K, iv, t).price
            expect(Math.abs(c - p - (S - K))).toBeLessThan(1e-6 * S)
          }
  })
})

describe('bs: монотонность', () => {
  it('цена растёт по IV (колл и пут)', () => {
    for (const type of ['call', 'put'] as const) {
      let prev = 0
      for (const iv of [0.3, 0.5, 0.8, 1.2]) {
        const price = bs(type, 100_000, 105_000, iv, daysToYears(30)).price
        expect(price).toBeGreaterThan(prev)
        prev = price
      }
    }
  })

  it('цена растёт по сроку (r = 0 — верно и для пута)', () => {
    for (const type of ['call', 'put'] as const) {
      let prev = 0
      for (const d of [7, 30, 90, 180]) {
        const price = bs(type, 100_000, 105_000, 0.6, daysToYears(d)).price
        expect(price).toBeGreaterThan(prev)
        prev = price
      }
    }
  })
})

describe('bs: границы греков', () => {
  it('дельта колла ∈ [0,1], пута ∈ [−1,0]; гамма ≥ 0; тета ≤ 0', () => {
    for (const S of SPOTS)
      for (const K of STRIKES)
        for (const iv of IVS)
          for (const d of DAYS) {
            const c = bs('call', S, K, iv, daysToYears(d))
            const p = bs('put', S, K, iv, daysToYears(d))
            expect(c.delta).toBeGreaterThanOrEqual(0)
            expect(c.delta).toBeLessThanOrEqual(1)
            expect(p.delta).toBeGreaterThanOrEqual(-1)
            expect(p.delta).toBeLessThanOrEqual(0)
            expect(c.gamma).toBeGreaterThanOrEqual(0)
            expect(c.thetaDay).toBeLessThanOrEqual(0)
            expect(p.thetaDay).toBeLessThanOrEqual(0)
          }
  })

  it('дельты колла и пута связаны: Δc − Δp = 1', () => {
    const c = bs('call', 100_000, 105_000, 0.6, daysToYears(30))
    const p = bs('put', 100_000, 105_000, 0.6, daysToYears(30))
    expect(c.delta - p.delta).toBeCloseTo(1, 9)
  })
})

describe('bs: вырожденные случаи', () => {
  it('t = 0 → внутренняя стоимость, нулевые греки', () => {
    const itm = bs('call', 110_000, 100_000, 0.6, 0)
    expect(itm.price).toBe(10_000)
    expect(itm.delta).toBe(1)
    expect(itm.gamma).toBe(0)
    const otm = bs('call', 90_000, 100_000, 0.6, 0)
    expect(otm.price).toBe(0)
    expect(otm.delta).toBe(0)
  })

  it('iv = 0 → внутренняя стоимость', () => {
    const p = bs('put', 90_000, 100_000, 0, daysToYears(30))
    expect(p.price).toBe(10_000)
    expect(p.delta).toBe(-1)
  })
})

describe('bs: vega1pct согласуется с конечной разностью', () => {
  it('прирост цены при +1 п.п. IV ≈ vega1pct', () => {
    const iv = 0.6
    const t = daysToYears(30)
    const base = bs('call', 100_000, 100_000, iv, t)
    const bumped = bs('call', 100_000, 100_000, iv + 0.01, t)
    const fd = bumped.price - base.price
    expect(Math.abs(fd - base.vega1pct)).toBeLessThan(0.05 * Math.abs(base.vega1pct))
  })
})
