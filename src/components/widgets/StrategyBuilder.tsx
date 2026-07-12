import { useMemo, useState } from 'react'
import { bs, daysToYears, legsGreeks, type Leg } from '../../lib/bs'
import { usd, usdSigned, num } from '../../lib/format'
import { PayoffChart, positionPnl, breakevens, type SpotLeg } from '../PayoffChart'
import { Slider, Seg, Stat } from '../ui'

const S0 = 100_000

export type StratKey =
  | 'bullcall'
  | 'bearput'
  | 'straddle'
  | 'strangle'
  | 'condor'
  | 'covered'
  | 'protective'
  | 'shortput'
  | 'shortstraddle'

const STRATS: Record<StratKey, { label: string; hint: string }> = {
  bullcall: {
    label: 'Bull Call Spread',
    hint: 'Купил Call ниже, продал Call выше. Умеренный рост.',
  },
  bearput: {
    label: 'Bear Put Spread',
    hint: 'Купил Put выше, продал Put ниже. Умеренное падение.',
  },
  straddle: {
    label: 'Long Straddle',
    hint: 'Купил Call + Put на одном страйке. Ставка на сильное движение.',
  },
  strangle: {
    label: 'Long Strangle',
    hint: 'Купил OTM Call + OTM Put. Дешевле стрэддла, нужно движение больше.',
  },
  condor: {
    label: 'Iron Condor',
    hint: 'Продал стрэнгл + купил защиту дальше. Ставка на боковик.',
  },
  covered: {
    label: 'Covered Call',
    hint: 'Держишь BTC + продал Call. Доход в боковике, потолок прибыли сверху.',
  },
  protective: { label: 'Protective Put', hint: 'Держишь BTC + купил Put. Страховка от обвала.' },
  shortput: {
    label: 'Cash-Secured Put',
    hint: 'Продал Put с обеспечением. Премия сейчас, покупка ниже при падении.',
  },
  shortstraddle: {
    label: 'Short Straddle',
    hint: 'Продал Call + Put. Максимальная тета — и неограниченный риск.',
  },
}

function buildLegs(
  key: StratKey,
  center: number,
  width: number,
  iv: number,
  dte: number,
): { legs: Leg[]; spotLeg?: SpotLeg } {
  const mk = (type: 'call' | 'put', side: 1 | -1, strike: number): Leg => ({
    type,
    side,
    strike,
    qty: 1,
    dte,
    premium: bs(type, S0, strike, iv / 100, daysToYears(dte)).price,
  })
  switch (key) {
    case 'bullcall':
      return { legs: [mk('call', 1, center), mk('call', -1, center + width)] }
    case 'bearput':
      return { legs: [mk('put', 1, center), mk('put', -1, center - width)] }
    case 'straddle':
      return { legs: [mk('call', 1, center), mk('put', 1, center)] }
    case 'strangle':
      return { legs: [mk('call', 1, center + width), mk('put', 1, center - width)] }
    case 'condor':
      return {
        legs: [
          mk('put', -1, center - width),
          mk('put', 1, center - width * 2),
          mk('call', -1, center + width),
          mk('call', 1, center + width * 2),
        ],
      }
    case 'covered':
      return { legs: [mk('call', -1, center + width)], spotLeg: { qty: 1, entry: S0 } }
    case 'protective':
      return { legs: [mk('put', 1, center - width)], spotLeg: { qty: 1, entry: S0 } }
    case 'shortput':
      return { legs: [mk('put', -1, center - width)] }
    case 'shortstraddle':
      return { legs: [mk('call', -1, center), mk('put', -1, center)] }
  }
}

export function StrategyBuilder(props: {
  strategies?: StratKey[]
  initial?: StratKey
  showGreeks?: boolean
}) {
  const keys = props.strategies ?? (Object.keys(STRATS) as StratKey[])
  const [key, setKey] = useState<StratKey>(props.initial ?? keys[0])
  const [center, setCenter] = useState(100_000)
  const [width, setWidth] = useState(10_000)
  const [iv, setIv] = useState(60)
  const [dte, setDte] = useState(30)
  const [spot, setSpot] = useState(S0)

  const { legs, spotLeg } = useMemo(
    () => buildLegs(key, center, width, iv, dte),
    [key, center, width, iv, dte],
  )

  const netPremium = legs.reduce((a, l) => a - l.side * l.qty * l.premium, 0) // >0 = заплатили (дебет)
  const pnlNow = positionPnl(legs, spotLeg, spot, iv / 100, dte)
  const g = legsGreeks(legs, spot, iv / 100, dte)
  if (spotLeg) g.delta += spotLeg.qty

  // max profit / max loss на экспирации по сетке (для спот-стратегий — в пределах графика)
  const { maxP, maxL } = useMemo(() => {
    let maxP = -Infinity,
      maxL = Infinity
    for (let i = 0; i <= 300; i++) {
      const x = 50_000 + (110_000 * i) / 300
      const v = positionPnl(legs, spotLeg, x, 0.0001, 0)
      maxP = Math.max(maxP, v)
      maxL = Math.min(maxL, v)
    }
    return { maxP, maxL }
  }, [legs, spotLeg])

  const bes = breakevens(legs, spotLeg, 50_000, 160_000)

  return (
    <div className="widget">
      <Seg
        options={keys.map(k => ({ value: k, label: STRATS[k].label }))}
        value={key}
        onChange={setKey}
      />
      <p className="hint">{STRATS[key].hint}</p>
      <PayoffChart
        legs={legs}
        spotLeg={spotLeg}
        spot={spot}
        iv={iv / 100}
        daysLeft={dte}
        xMin={60_000}
        xMax={150_000}
      />
      <div className="sliders">
        <Slider
          label="Центральный страйк"
          value={center}
          min={80_000}
          max={120_000}
          step={1000}
          display={usd(center)}
          onChange={setCenter}
        />
        <Slider
          label="Ширина (до соседнего страйка)"
          value={width}
          min={2000}
          max={25_000}
          step={1000}
          display={usd(width)}
          onChange={setWidth}
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
        <Slider
          label="Цена BTC сейчас"
          value={spot}
          min={60_000}
          max={150_000}
          step={500}
          display={usd(spot)}
          accent="#3b82f6"
          onChange={setSpot}
        />
      </div>
      <div className="stats">
        <Stat
          label={netPremium >= 0 ? 'Заплатили премии (дебет)' : 'Получили премии (кредит)'}
          value={usd(Math.abs(netPremium))}
        />
        <Stat label="Max прибыль" value={maxP > 1e8 ? '∞' : usdSigned(maxP)} tone="pos" />
        <Stat label="Max убыток" value={maxL < -1e8 ? '−∞' : usdSigned(maxL)} tone="neg" />
        <Stat label="Безубыток" value={bes.length ? bes.map(b => usd(b)).join(' / ') : '—'} />
        <Stat label="P&L сейчас" value={usdSigned(pnlNow)} tone={pnlNow >= 0 ? 'pos' : 'neg'} />
        {props.showGreeks && (
          <>
            <Stat label="Дельта поз." value={num(g.delta, 2)} />
            <Stat
              label="Тета ($/день)"
              value={usdSigned(g.thetaDay)}
              tone={g.thetaDay >= 0 ? 'pos' : 'neg'}
            />
            <Stat label="Вега ($/1% IV)" value={usdSigned(g.vega1pct)} />
          </>
        )}
      </div>
    </div>
  )
}
