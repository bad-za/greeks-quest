import { useMemo, useState } from 'react'
import { bs, daysToYears, type Leg, type OptType } from '../../lib/bs'
import { usd, usdSigned, num } from '../../lib/format'
import { PayoffChart, positionPnl, breakevens } from '../PayoffChart'
import { Slider, Seg, Stat } from '../ui'

const S0 = 100_000 // цена BTC в момент открытия позиции

type Pos = 'lc' | 'lp' | 'sc' | 'sp'
type SliderKey = 'strike' | 'spot' | 'iv' | 'dte'

const POS: Record<Pos, { type: OptType; side: 1 | -1; label: string }> = {
  lc: { type: 'call', side: 1, label: 'Купить Call' },
  lp: { type: 'put', side: 1, label: 'Купить Put' },
  sc: { type: 'call', side: -1, label: 'Продать Call' },
  sp: { type: 'put', side: -1, label: 'Продать Put' },
}

const HINTS = {
  strike:
    'Цена из контракта: по ней колл даёт право купить, а пут — продать. Сдвинь — и увидишь, как меняется премия: «удобные» страйки стоят дороже.',
  spot: 'Что сделал рынок после твоего входа в позицию. Подвигай и смотри на P&L — это твой результат, если BTC придёт к этой цене.',
  iv: 'Ожидаемая «тряска» рынка, зашитая в цену опциона. Чем выше IV, тем дороже премия. Подробный разбор — в акте II.',
  dte: 'Срок жизни опциона. Больше времени — больше шансов дойти до цели, поэтому премия дороже.',
}

export function PayoffExplorer(props: {
  /** какие позиции доступны (по умолчанию все четыре) */
  positions?: Pos[]
  /** какие ползунки показывать (по умолчанию все) — ранним уровням хватает пары */
  sliders?: SliderKey[]
  /** показывать ли греки */
  showGreeks?: boolean
  /** показывать ли слайдер прошедших дней */
  showTime?: boolean
  initial?: Pos
}) {
  const positions = props.positions ?? (['lc', 'lp', 'sc', 'sp'] as Pos[])
  const shown = new Set<SliderKey>(props.sliders ?? ['strike', 'spot', 'iv', 'dte'])
  const [pos, setPos] = useState<Pos>(props.initial ?? positions[0])
  const [strike, setStrike] = useState(105_000)
  const [iv, setIv] = useState(60)
  const [dte, setDte] = useState(30)
  const [daysPassed, setDaysPassed] = useState(0)
  const [spot, setSpot] = useState(S0)

  const p = POS[pos]
  const premium = useMemo(
    () => bs(p.type, S0, strike, iv / 100, daysToYears(dte)).price,
    [pos, strike, iv, dte],
  )
  const leg: Leg = { type: p.type, side: p.side, strike, qty: 1, premium, dte }
  const daysLeft = Math.max(dte - (props.showTime ? daysPassed : 0), 0)
  const pnlNow = positionPnl([leg], undefined, spot, iv / 100, daysLeft)
  const g = bs(p.type, spot, strike, iv / 100, daysToYears(Math.max(daysLeft, 0.01)))
  const be = breakevens([leg], undefined, 10_000, 300_000)

  return (
    <div className="widget">
      <Seg
        options={positions.map(v => ({ value: v, label: POS[v].label }))}
        value={pos}
        onChange={v => setPos(v)}
      />
      <PayoffChart
        legs={[leg]}
        spot={spot}
        iv={iv / 100}
        daysLeft={daysLeft}
        xMin={60_000}
        xMax={150_000}
      />
      <div className="sliders">
        {shown.has('strike') && (
          <Slider label="Страйк" value={strike} min={70_000} max={140_000} step={1000} display={usd(strike)} hint={HINTS.strike} onChange={setStrike} />
        )}
        {shown.has('spot') && (
          <Slider label="Цена BTC сейчас" value={spot} min={60_000} max={150_000} step={500} display={usd(spot)} accent="#3b82f6" hint={HINTS.spot} onChange={setSpot} />
        )}
        {shown.has('iv') && (
          <Slider label="IV" value={iv} min={20} max={150} display={`${iv}%`} hint={HINTS.iv} onChange={setIv} />
        )}
        {shown.has('dte') && (
          <Slider label="Дней до экспирации" value={dte} min={1} max={90} display={`${dte}д`} hint={HINTS.dte} onChange={d => { setDte(d); setDaysPassed(dp => Math.min(dp, d)) }} />
        )}
        {props.showTime && (
          <Slider label="Дней прошло" value={Math.min(daysPassed, dte)} min={0} max={dte} display={`${Math.min(daysPassed, dte)}д`} accent="#f59e0b" hint="Промотай время вперёд и посмотри, как тает временная стоимость опциона." onChange={setDaysPassed} />
        )}
      </div>
      <div className="stats">
        <Stat label="Премия (вход при $100k)" value={usd(premium)} />
        <Stat label="Безубыток (BE)" value={be.length ? usd(be[0]) : '—'} />
        <Stat label="P&L сейчас" value={usdSigned(pnlNow)} tone={pnlNow >= 0 ? 'pos' : 'neg'} />
        {props.showGreeks && (
          <>
            <Stat label="Дельта" value={num(p.side * g.delta, 2)} />
            <Stat label="Гамма" value={num(p.side * g.gamma * 1000, 3)} />
            <Stat label="Тета ($/день)" value={usdSigned(p.side * g.thetaDay)} tone={p.side * g.thetaDay >= 0 ? 'pos' : 'neg'} />
            <Stat label="Вега ($/1% IV)" value={usdSigned(p.side * g.vega1pct)} />
          </>
        )}
      </div>
    </div>
  )
}
