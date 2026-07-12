// Временный smoke-тест инфраструктуры (заменяется настоящими тестами в этапе 1)
import { describe, it, expect } from 'vitest'
import { bs } from './bs'

describe('smoke', () => {
  it('bs возвращает конечную цену', () => {
    const g = bs('call', 100_000, 105_000, 0.6, 30 / 365)
    expect(Number.isFinite(g.price)).toBe(true)
    expect(g.price).toBeGreaterThan(0)
  })
})
