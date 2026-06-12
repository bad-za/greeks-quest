import { useState } from 'react'
import { usd } from '../../lib/format'
import { XYChart } from '../XYChart'
import { Slider } from '../ui'

const S0 = 100_000

/** Улыбка волатильности: IV по страйкам с управляемыми смайлом и скью */
export function SmileExplorer() {
  const [atmIv, setAtmIv] = useState(55)
  const [smile, setSmile] = useState(40)
  const [skew, setSkew] = useState(-10)

  const pts: [number, number][] = []
  for (let k = 60_000; k <= 160_000; k += 2000) {
    const m = Math.log(k / S0) // log-moneyness
    const iv = atmIv + smile * m * m * 10 + skew * m * 5
    pts.push([k, Math.max(iv, 10)])
  }

  return (
    <div className="widget">
      <XYChart
        series={[{ points: pts, color: '#22d3ee', label: 'IV по страйкам' }]}
        vMarkers={[{ x: S0, color: '#3b82f6', label: 'ATM (BTC = $100k)' }]}
        xFmt={x => `${Math.round(x / 1000)}k`}
        yFmt={y => `${Math.round(y)}%`}
        height={280}
      />
      <div className="sliders">
        <Slider label="ATM IV" value={atmIv} min={30} max={120} display={`${atmIv}%`} onChange={setAtmIv} />
        <Slider label="Кривизна улыбки" value={smile} min={0} max={100} display={String(smile)} onChange={setSmile} />
        <Slider label="Скью (перекос)" value={skew} min={-40} max={40} display={String(skew)} onChange={setSkew} />
      </div>
      <p className="hint">
        Скью &lt; 0 — путы дороже коллов (страх обвала, типично для акций и для крипты в медвежьи периоды).
        Скью &gt; 0 — коллы дороже (жадность, FOMO на памп — частая картина в крипте перед халвингом или ETF).
        В крипте скью «гуляет» в обе стороны, в отличие от рынка акций.
      </p>
    </div>
  )
}
