import { useState } from 'react'
import { bs, daysToYears } from '../../lib/bs'
import { usd } from '../../lib/format'
import { XYChart } from '../XYChart'
import { Slider } from '../ui'

const S0 = 100_000

/** Стоимость опциона по мере приближения экспирации: тающий лёд */
export function ThetaDecay() {
  const [iv, setIv] = useState(60)
  const [dte, setDte] = useState(60)

  const strikes = [
    { k: 100_000, color: '#f59e0b', label: 'ATM 100k' },
    { k: 110_000, color: '#3b82f6', label: 'OTM 110k' },
    { k: 90_000, color: '#a78bfa', label: 'ITM 90k' },
  ]

  const series = strikes.map(s => {
    const pts: [number, number][] = []
    for (let d = dte; d >= 0; d--) {
      pts.push([dte - d, bs('call', S0, s.k, iv / 100, daysToYears(d)).price])
    }
    return { points: pts, color: s.color, label: s.label }
  })

  return (
    <div className="widget">
      <XYChart series={series} xFmt={x => `${Math.round(x)}д`} yFmt={y => usd(y)} height={280} />
      <p className="hint">
        По горизонтали — прошедшие дни (при неподвижной цене BTC = $100,000). Смотри, как ATM-опцион
        «тает» всё быстрее к концу.
      </p>
      <div className="sliders">
        <Slider label="IV" value={iv} min={20} max={150} display={`${iv}%`} onChange={setIv} />
        <Slider
          label="Срок жизни опциона"
          value={dte}
          min={7}
          max={120}
          display={`${dte}д`}
          onChange={setDte}
        />
      </div>
    </div>
  )
}
