import { useMemo, useState } from 'react'
import { gbmPath } from '../../lib/rng'
import { usd } from '../../lib/format'
import { XYChart, type Series } from '../XYChart'
import { Slider } from '../ui'

const COLORS = [
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#a78bfa',
  '#22d3ee',
  '#f472b6',
  '#fb923c',
  '#94a3b8',
]

/** Что на самом деле значит «IV 60%»: пучок случайных путей цены */
export function PathSim() {
  const [vol, setVol] = useState(60)
  const [days, setDays] = useState(30)
  const [batch, setBatch] = useState(0)

  const series: Series[] = useMemo(() => {
    const out: Series[] = COLORS.map((color, i) => ({
      points: gbmPath({
        seed: 1000 + batch * 100 + i,
        spot: 100_000,
        days,
        vol: vol / 100,
        drift: 0,
      }).map((p, d) => [d, p] as [number, number]),
      color,
      width: 1.6,
    }))
    // граница ±1 сигма
    const sigmaUp: [number, number][] = []
    const sigmaDn: [number, number][] = []
    for (let d = 0; d <= days; d++) {
      const sd = (vol / 100) * Math.sqrt(d / 365)
      sigmaUp.push([d, 100_000 * Math.exp(sd)])
      sigmaDn.push([d, 100_000 * Math.exp(-sd)])
    }
    out.push({ points: sigmaUp, color: '#64748b', dash: '6 5', width: 1.8, label: '±1σ коридор' })
    out.push({ points: sigmaDn, color: '#64748b', dash: '6 5', width: 1.8 })
    return out
  }, [vol, days, batch])

  return (
    <div className="widget">
      <XYChart series={series} xFmt={x => `${Math.round(x)}д`} yFmt={y => usd(y)} height={300} />
      <div className="sliders">
        <Slider
          label="Волатильность (годовая)"
          value={vol}
          min={10}
          max={150}
          display={`${vol}%`}
          onChange={setVol}
        />
        <Slider
          label="Горизонт"
          value={days}
          min={7}
          max={90}
          display={`${days}д`}
          onChange={setDays}
        />
      </div>
      <button className="btn" onClick={() => setBatch(b => b + 1)}>
        🎲 Перебросить пути
      </button>
      <p className="hint">
        Каждая линия — один возможный месяц жизни BTC при выбранной волатильности. Примерно 2 из 3
        путей остаются внутри серого коридора ±1σ. IV — это рыночный консенсус о ширине этого
        коридора.
      </p>
    </div>
  )
}
