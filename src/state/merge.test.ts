import { describe, it, expect } from 'vitest'
import { mergeSaves } from './merge'
import type { SaveState } from './store'

function save(over: Partial<SaveState> = {}): SaveState {
  return {
    xp: 0,
    balance: 10_000,
    progress: {},
    completedLevels: [],
    achievements: [],
    busts: 0,
    ...over,
  }
}

describe('mergeSaves', () => {
  it('облако впереди по XP, но уникальная ачивка локального не теряется', () => {
    const local = save({ xp: 100, achievements: ['quiz-ace'] })
    const cloud = save({ xp: 500, balance: 12_000, achievements: ['first-trade'] })
    const m = mergeSaves(local, cloud)
    expect(m.xp).toBe(500)
    expect(m.balance).toBe(12_000)
    expect(m.achievements).toEqual(expect.arrayContaining(['first-trade', 'quiz-ace']))
  })

  it('устройства прошли разные уровни: union уровней, поэлементный max прогресса', () => {
    const local = save({ xp: 300, completedLevels: ['intro'], progress: { intro: 5, greeks: 2 } })
    const cloud = save({
      xp: 280,
      completedLevels: ['four-positions'],
      progress: { intro: 3, greeks: 4 },
    })
    const m = mergeSaves(local, cloud)
    expect(m.completedLevels.sort()).toEqual(['four-positions', 'intro'])
    expect(m.progress).toEqual({ intro: 5, greeks: 4 })
  })

  it('облако после сброса (INITIAL), локальный с прогрессом → локальный побеждает', () => {
    const local = save({ xp: 700, balance: 8_000, completedLevels: ['intro'], busts: 1 })
    const cloud = save()
    const m = mergeSaves(local, cloud)
    expect(m).toEqual(local)
  })

  it('busts — max, не сумма (иначе задваивается при каждом слиянии)', () => {
    const m = mergeSaves(save({ xp: 10, busts: 2 }), save({ busts: 1 }))
    expect(m.busts).toBe(2)
  })

  it('полное равенство → результат эквивалентен входу', () => {
    const s = save({ xp: 50, completedLevels: ['intro'], progress: { intro: 4 } })
    expect(mergeSaves(s, save({ xp: 50, completedLevels: ['intro'], progress: { intro: 4 } }))).toEqual(s)
  })
})
