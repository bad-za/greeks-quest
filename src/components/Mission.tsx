import { useEffect, useMemo, useRef, useState } from 'react'
import { gbmPath } from '../lib/rng'
import { priceLegs, pnlAt } from '../lib/mission-math'
import { usd, usdSigned, pct } from '../lib/format'
import { XYChart } from './XYChart'
import { Stat } from './ui'
import { haptic } from '../lib/telegram'
import type { Mission as MissionData, Verdict } from '../content/types'

export function Mission(props: {
  mission: MissionData
  alreadyDone: boolean
  onComplete: (verdict: Verdict, pnl: number) => void
}) {
  const m = props.mission
  const [phase, setPhase] = useState<'brief' | 'run' | 'result'>('brief')
  const [choiceIdx, setChoiceIdx] = useState<number | null>(null)
  const [day, setDay] = useState(0)
  const [reported, setReported] = useState(props.alreadyDone)
  const [isReplay, setIsReplay] = useState(props.alreadyDone)
  const timer = useRef<number | null>(null)

  const path = useMemo(() => {
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
  }, [m])

  const choice = choiceIdx !== null ? m.choices[choiceIdx] : null
  const legs = useMemo(() => (choice ? priceLegs(m, choice) : []), [choice, m])

  useEffect(() => {
    if (phase !== 'run') return
    const stepMs = Math.max(2800 / m.days, 40)
    timer.current = window.setInterval(() => {
      setDay(d => {
        if (d >= m.days) {
          if (timer.current) window.clearInterval(timer.current)
          setPhase('result')
          return d
        }
        return d + 1
      })
    }, stepMs)
    return () => {
      if (timer.current) window.clearInterval(timer.current)
    }
  }, [phase, m.days])

  useEffect(() => {
    if (phase === 'result' && choice) {
      const pnl = pnlAt(m, choice, legs, path[m.days], m.days)
      haptic(choice.verdict === 'bad' ? 'error' : pnl >= 0 ? 'success' : 'warning')
      if (!reported) {
        setReported(true)
        props.onComplete(choice.verdict, pnl)
      }
    }
  }, [phase])

  const premiumPaid = legs.reduce((a, l) => a + l.side * l.qty * l.premium, 0)
  const spotCost = choice?.spotQty ? choice.spotQty * m.spot : 0
  const curPnl = choice ? pnlAt(m, choice, legs, path[Math.min(day, m.days)], day) : 0

  const pathPts: [number, number][] = path.slice(0, day + 1).map((p, i) => [i, p])
  const fullDomain: [number, number][] = [
    [0, Math.min(...path) * 0.98],
    [m.days, Math.max(...path) * 1.02],
  ]

  const verdictUi: Record<Verdict, { cls: string; label: string }> = {
    best: { cls: 'verdict-best', label: '🎯 Лучшее решение' },
    ok: { cls: 'verdict-ok', label: '👍 Рабочее решение' },
    bad: { cls: 'verdict-bad', label: '💢 Дорогой урок' },
  }

  return (
    <div className="mission">
      <div className="mission-head">
        <span className="mission-tag">МИССИЯ</span>
        <h3>{m.title}</h3>
        {isReplay && <span className="mission-replay">тренировка — на баланс не влияет</span>}
      </div>

      {phase === 'brief' && (
        <>
          <div className="mission-brief">{m.brief}</div>
          <div className="stats">
            <Stat label="BTC сейчас" value={usd(m.spot)} />
            <Stat label="IV" value={pct(m.iv)} />
            <Stat label="Экспирация опционов" value={`через ${m.dte}д`} />
            <Stat label="Горизонт сценария" value={`${m.days}д`} />
          </div>
          <p className="mission-choose">Твоё решение:</p>
          <div className="mission-choices">
            {m.choices.map((c, i) => {
              const pl = priceLegs(m, c)
              const cost =
                pl.reduce((a, l) => a + l.side * l.qty * l.premium, 0) +
                (c.spotQty ? c.spotQty * m.spot : 0)
              return (
                <button
                  key={i}
                  className="choice-card"
                  onClick={() => {
                    setChoiceIdx(i)
                    setDay(0)
                    setPhase('run')
                  }}
                >
                  <b>{c.label}</b>
                  <span>{c.desc}</span>
                  <span className="choice-cost">
                    {cost > 0
                      ? `Стоимость: ${usd(cost)}`
                      : cost < 0
                        ? `Получаешь премию: ${usd(-cost)}`
                        : 'Бесплатно'}
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {(phase === 'run' || phase === 'result') && choice && (
        <>
          <div className="mission-run-head">
            <b>{choice.label}</b>
            <span>
              День {Math.min(day, m.days)} / {m.days}
            </span>
          </div>
          <XYChart
            series={[
              { points: fullDomain, color: 'transparent', width: 0 },
              { points: pathPts, color: '#3b82f6', width: 2.2, label: 'BTC' },
            ]}
            vMarkers={
              'fixed' in m.path || !m.path.shockDay
                ? []
                : day >= m.path.shockDay
                  ? [{ x: m.path.shockDay, color: '#ef4444', label: 'шок' }]
                  : []
            }
            xFmt={x => `${Math.round(x)}д`}
            yFmt={y => `${Math.round(y / 1000)}k`}
            height={260}
          />
          <div className="stats">
            <Stat label="BTC" value={usd(path[Math.min(day, m.days)])} />
            <Stat
              label={premiumPaid + spotCost >= 0 ? 'Вложено' : 'Получено премии'}
              value={usd(Math.abs(premiumPaid + spotCost))}
            />
            <Stat
              label="P&L позиции"
              value={usdSigned(curPnl)}
              tone={curPnl >= 0 ? 'pos' : 'neg'}
            />
          </div>
        </>
      )}

      {phase === 'result' && choice && (
        <div className="mission-result">
          <div className={`verdict ${verdictUi[choice.verdict].cls}`}>
            {verdictUi[choice.verdict].label}
            <b className={curPnl >= 0 ? 'pos' : 'neg'}>{usdSigned(curPnl)}</b>
          </div>
          <p className="mission-debrief">{choice.debrief}</p>
          <div className="mission-debrief general">{m.debrief}</div>
          <div className="row">
            <button
              className="btn"
              onClick={() => {
                setIsReplay(true)
                setChoiceIdx(null)
                setPhase('brief')
              }}
            >
              🔁 Попробовать другой вариант
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
