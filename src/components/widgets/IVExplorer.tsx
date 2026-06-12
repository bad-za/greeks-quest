import { useState } from 'react'
import { bs, daysToYears } from '../../lib/bs'
import { usd } from '../../lib/format'
import { XYChart } from '../XYChart'
import { Slider, Stat } from '../ui'

const S0 = 100_000

/** Цена опциона как функция IV + демонстрация IV crush */
export function IVExplorer() {
  const [strike, setStrike] = useState(105_000)
  const [dte, setDte] = useState(14)
  const [ivBefore, setIvBefore] = useState(90)
  const [ivAfter, setIvAfter] = useState(55)

  const pts: [number, number][] = []
  for (let iv = 20; iv <= 150; iv += 2) {
    pts.push([iv, bs('call', S0, strike, iv / 100, daysToYears(dte)).price])
  }

  const before = bs('call', S0, strike, ivBefore / 100, daysToYears(dte)).price
  const after = bs('call', S0, strike, ivAfter / 100, daysToYears(dte)).price
  const crush = after - before

  return (
    <div className="widget">
      <XYChart
        series={[{ points: pts, color: '#22d3ee', label: 'Цена Call от IV' }]}
        vMarkers={[
          { x: ivBefore, color: '#ef4444', label: 'до события' },
          { x: ivAfter, color: '#22c55e', label: 'после' },
        ]}
        xFmt={x => `${Math.round(x)}%`}
        yFmt={y => usd(y)}
        height={280}
      />
      <div className="sliders">
        <Slider label="Страйк" value={strike} min={80_000} max={130_000} step={1000} display={usd(strike)} onChange={setStrike} />
        <Slider label="Дней до экспирации" value={dte} min={1} max={60} display={`${dte}д`} onChange={setDte} />
        <Slider label="IV до события" value={ivBefore} min={20} max={150} display={`${ivBefore}%`} accent="#ef4444" onChange={setIvBefore} />
        <Slider label="IV после события" value={ivAfter} min={20} max={150} display={`${ivAfter}%`} accent="#22c55e" onChange={setIvAfter} />
      </div>
      <div className="stats">
        <Stat label="Премия до" value={usd(before)} />
        <Stat label="Премия после (цена BTC не изменилась!)" value={usd(after)} />
        <Stat label="IV crush" value={usd(crush)} tone={crush >= 0 ? 'pos' : 'neg'} />
      </div>
    </div>
  )
}
