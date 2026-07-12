// SSR-смоук: гистограмма рендерится в валидный SVG с барами и нулевой линией
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Histogram } from './Histogram'
import { mcOutcomes } from '../lib/mission-math'
import type { Mission, MissionChoice } from '../content/types'

const m: Mission = {
  id: 't',
  title: 't',
  brief: null,
  spot: 100_000,
  iv: 60,
  dte: 30,
  days: 30,
  path: { seed: 1, vol: 0.6, drift: 0 },
  choices: [],
  debrief: null,
}

const longCall: MissionChoice = {
  label: '',
  desc: '',
  legs: [{ type: 'call', side: 1, strike: 105_000, qty: 1 }],
  verdict: 'ok',
  debrief: '',
}

describe('Histogram', () => {
  it('рисует бары обоих знаков и пунктир нуля на реальном МК-распределении', () => {
    const html = renderToStaticMarkup(<Histogram values={mcOutcomes(m, longCall, 500)} />)
    expect(html).toContain('<svg')
    expect(html).toContain('var(--pos)') // прибыльный хвост
    expect(html).toContain('var(--neg)') // убыточный хвост
    expect(html).toContain('stroke-dasharray') // нулевая линия
  })

  it('пустой массив — ничего не рендерит', () => {
    expect(renderToStaticMarkup(<Histogram values={[]} />)).toBe('')
  })
})
