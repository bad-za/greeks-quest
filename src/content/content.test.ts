// Контент-линт: структура курса и сверка вердиктов миссий с честно посчитанным P&L.
// Падение здесь означает «курс учит неправильному» — чини контент, а не тест.
import { describe, it, expect } from 'vitest'
import { LEVELS, ACTS } from './levels'
import type { Mission } from './types'
import { priceLegs, pnlAt } from '../lib/mission-math'
import { gbmPath } from '../lib/rng'

/**
 * Миссии, где выбор с вердиктом bad обыгрывает best на пути сценария —
 * осознанно (урок «плохое решение случайно сработало»). Каждый id — с обоснованием.
 */
const KNOWN_ANOMALIES: string[] = [
  // голый колл ×0.3 собирает тройную премию и обыгрывает covered call на тихом
  // пути — задумано: дебриф прямо учит «прибыльная сделка ≠ хорошее решение»
  'm-rent',
]

const missions: Mission[] = LEVELS.flatMap(l =>
  l.steps.flatMap(s => (s.kind === 'mission' ? [s.mission] : [])),
)

function missionPath(m: Mission): number[] {
  if ('fixed' in m.path) return m.path.fixed
  return gbmPath({
    seed: m.path.seed,
    spot: m.spot,
    days: m.days,
    vol: m.path.vol,
    drift: m.path.drift,
    shockDay: m.path.shockDay,
    shockPct: m.path.shockPct,
  })
}

describe('структура курса', () => {
  it('id уровней уникальны', () => {
    const ids = LEVELS.map(l => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('id миссий уникальны', () => {
    const ids = missions.map(m => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('каждый уровень принадлежит существующему акту и имеет шаги', () => {
    const acts = new Set(ACTS.map(a => a.num))
    for (const l of LEVELS) {
      expect(acts.has(l.act), `уровень ${l.id}: акт ${l.act}`).toBe(true)
      expect(l.steps.length, `уровень ${l.id}: нет шагов`).toBeGreaterThan(0)
    }
  })

  it('квизы: ≥2 вариантов, correct в диапазоне, explain непустой', () => {
    for (const l of LEVELS)
      for (const s of l.steps) {
        if (s.kind !== 'quiz') continue
        for (const q of s.questions) {
          const label = `${l.id}: «${q.question.slice(0, 40)}…»`
          expect(q.options.length, label).toBeGreaterThanOrEqual(2)
          expect(q.correct, label).toBeGreaterThanOrEqual(0)
          expect(q.correct, label).toBeLessThan(q.options.length)
          expect(q.explain.trim().length, label).toBeGreaterThan(0)
        }
      }
  })

  it('миссии: ≥2 выборов, есть best и есть не-best', () => {
    for (const m of missions) {
      expect(m.choices.length, m.id).toBeGreaterThanOrEqual(2)
      expect(m.choices.some(c => c.verdict === 'best'), `${m.id}: нет best`).toBe(true)
      expect(m.choices.some(c => c.verdict !== 'best'), `${m.id}: все best`).toBe(true)
    }
  })

  it('фиксированные пути: length === days + 1 (иначе NaN в P&L на финальном дне)', () => {
    for (const m of missions) {
      if (!('fixed' in m.path)) continue
      expect(m.path.fixed.length, m.id).toBe(m.days + 1)
    }
  })
})

describe('математика миссий', () => {
  it('премии ног конечны и положительны', () => {
    for (const m of missions)
      for (const c of m.choices)
        for (const leg of priceLegs(m, c)) {
          expect(Number.isFinite(leg.premium), `${m.id} / ${c.label}`).toBe(true)
          expect(leg.premium, `${m.id} / ${c.label}`).toBeGreaterThan(0)
        }
  })

  it('P&L каждого выбора: 0 на дне 0, конечен на финальном дне', () => {
    for (const m of missions) {
      const path = missionPath(m)
      for (const c of m.choices) {
        const legs = priceLegs(m, c)
        expect(Math.abs(pnlAt(m, c, legs, m.spot, 0)), `${m.id} / ${c.label}: день 0`).toBeLessThan(1)
        const final = pnlAt(m, c, legs, path[m.days], m.days)
        expect(Number.isFinite(final), `${m.id} / ${c.label}: финал`).toBe(true)
      }
    }
  })

  it('вердикты согласованы с P&L: best строго лучше каждого bad', () => {
    const rows: { mission: string; choice: string; verdict: string; pnl: number }[] = []
    for (const m of missions) {
      const path = missionPath(m)
      const pnls = m.choices.map(c => ({
        c,
        pnl: pnlAt(m, c, priceLegs(m, c), path[m.days], m.days),
      }))
      for (const { c, pnl } of pnls)
        rows.push({ mission: m.id, choice: c.label, verdict: c.verdict, pnl: Math.round(pnl) })
      if (KNOWN_ANOMALIES.includes(m.id)) continue
      for (const best of pnls.filter(p => p.c.verdict === 'best'))
        for (const bad of pnls.filter(p => p.c.verdict === 'bad')) {
          expect(
            best.pnl,
            `${m.id}: best «${best.c.label}» (${Math.round(best.pnl)}) не лучше bad «${bad.c.label}» (${Math.round(bad.pnl)})`,
          ).toBeGreaterThan(bad.pnl)
        }
    }
    // сводная таблица всех исходов — видна в логе CI, полезна при правках контента
    console.table(rows)
  })
})
