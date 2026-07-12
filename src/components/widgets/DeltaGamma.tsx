import { useState } from 'react'
import { bs, daysToYears } from '../../lib/bs'
import { usd, num } from '../../lib/format'
import { XYChart } from '../XYChart'
import { Slider, Stat } from '../ui'

/** Дельта и гамма колла как функция цены BTC */
export function DeltaGamma() {
  const [strike, setStrike] = useState(100_000)
  const [iv, setIv] = useState(60)
  const [dte, setDte] = useState(21)
  const [spot, setSpot] = useState(100_000)

  const deltaPts: [number, number][] = []
  const gammaPts: [number, number][] = []
  let maxGamma = 0
  for (let s = 60_000; s <= 150_000; s += 1000) {
    const g = bs('call', s, strike, iv / 100, daysToYears(dte))
    deltaPts.push([s, g.delta])
    gammaPts.push([s, g.gamma])
    maxGamma = Math.max(maxGamma, g.gamma)
  }
  // нормируем гамму в масштаб [0..1], чтобы рисовать на одном графике с дельтой
  const gammaScaled: [number, number][] = gammaPts.map(([x, y]) => [
    x,
    maxGamma > 0 ? y / maxGamma : 0,
  ])

  const g = bs('call', spot, strike, iv / 100, daysToYears(dte))

  return (
    <div className="widget">
      <XYChart
        series={[
          { points: deltaPts, color: '#3b82f6', label: 'Дельта Call' },
          { points: gammaScaled, color: '#f472b6', dash: '5 4', label: 'Гамма (норм.)' },
        ]}
        vMarkers={[
          { x: strike, color: '#64748b', label: 'страйк' },
          { x: spot, color: '#22c55e', label: 'BTC' },
        ]}
        xFmt={x => `${Math.round(x / 1000)}k`}
        yFmt={y => num(y, 1)}
        height={280}
      />
      <div className="sliders">
        <Slider
          label="Страйк"
          value={strike}
          min={80_000}
          max={130_000}
          step={1000}
          display={usd(strike)}
          onChange={setStrike}
        />
        <Slider
          label="Цена BTC"
          value={spot}
          min={60_000}
          max={150_000}
          step={500}
          display={usd(spot)}
          accent="#22c55e"
          onChange={setSpot}
        />
        <Slider label="IV" value={iv} min={20} max={150} display={`${iv}%`} onChange={setIv} />
        <Slider
          label="Дней до экспирации"
          value={dte}
          min={1}
          max={90}
          display={`${dte}д`}
          onChange={setDte}
        />
      </div>
      <div className="stats">
        <Stat label="Дельта" value={num(g.delta, 2)} />
        <Stat label="≈ вероятность экспирации ITM" value={`${Math.round(g.delta * 100)}%`} />
        <Stat label="Гамма (Δдельты на $1k движения)" value={num(g.gamma * 1000, 3)} />
      </div>
      <p className="hint">
        Уменьши количество дней до экспирации и посмотри, как кривая дельты превращается в
        «ступеньку», а горб гаммы сжимается к страйку. Это и есть гамма-риск последних дней.
      </p>
    </div>
  )
}
