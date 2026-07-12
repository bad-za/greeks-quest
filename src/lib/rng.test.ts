import { describe, it, expect } from 'vitest'
import { gbmPath, mulberry32 } from './rng'

describe('mulberry32', () => {
  it('детерминирован и даёт значения в [0, 1)', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    for (let i = 0; i < 100; i++) {
      const v = a()
      expect(v).toBe(b())
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('gbmPath', () => {
  const spec = { seed: 42, spot: 100_000, days: 30, vol: 0.6, drift: 0 }

  it('длина days + 1, начинается со спота', () => {
    const path = gbmPath(spec)
    expect(path).toHaveLength(31)
    expect(path[0]).toBe(100_000)
    for (const p of path) expect(Number.isFinite(p) && p > 0).toBe(true)
  })

  it('детерминизм: один seed — один путь', () => {
    expect(gbmPath(spec)).toEqual(gbmPath(spec))
  })

  it('разные seed — разные пути', () => {
    const a = gbmPath(spec)
    const b = gbmPath({ ...spec, seed: 43 })
    expect(a).not.toEqual(b)
  })

  it('шок умножает путь с shockDay на (1 + shockPct)', () => {
    const base = gbmPath(spec)
    const shocked = gbmPath({ ...spec, shockDay: 10, shockPct: -0.3 })
    expect(shocked[9]).toBeCloseTo(base[9], 9)
    // GBM мультипликативен: после шока весь хвост масштабируется на 0.7
    expect(shocked[10] / base[10]).toBeCloseTo(0.7, 9)
    expect(shocked[30] / base[30]).toBeCloseTo(0.7, 9)
  })
})
