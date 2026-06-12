import { useState } from 'react'
import { usd, btc } from '../../lib/format'
import { XYChart } from '../XYChart'
import { Slider, Stat } from '../ui'

/**
 * Инверсный опцион в стиле Deribit: премия и расчёты в BTC.
 * Выплата колла на экспирации = max(S-K, 0) USD = max(S-K, 0)/S BTC.
 */
export function InverseOption() {
  const [strike, setStrike] = useState(100_000)
  const [premiumBtc, setPremiumBtc] = useState(0.03)
  const [expiry, setExpiry] = useState(115_000)

  const usdPts: [number, number][] = []
  const btcPts: [number, number][] = []
  for (let s = 60_000; s <= 160_000; s += 1000) {
    const payoffBtc = Math.max(s - strike, 0) / s
    const pnlBtc = payoffBtc - premiumBtc
    // P&L в USD: btc-результат по итоговой цене
    usdPts.push([s, pnlBtc * s])
    btcPts.push([s, pnlBtc * 1000]) // в mBTC для масштаба на одном графике? нет — отдельная ось не получится
  }

  const payoffBtcAt = Math.max(expiry - strike, 0) / expiry
  const pnlBtcAt = payoffBtcAt - premiumBtc
  const pnlUsdAt = pnlBtcAt * expiry
  const premiumUsdAtEntry = premiumBtc * 100_000

  return (
    <div className="widget">
      <XYChart
        series={[{ points: usdPts, color: '#e2e8f0', width: 2.4, fillToZero: true, label: 'P&L в USD (премия в BTC!)' }]}
        vMarkers={[
          { x: strike, color: '#64748b', label: 'страйк' },
          { x: expiry, color: '#3b82f6', label: 'цена на эксп.' },
        ]}
        yZeroLine
        xFmt={x => `${Math.round(x / 1000)}k`}
        yFmt={y => usd(y)}
        height={280}
      />
      <div className="sliders">
        <Slider label="Страйк Call" value={strike} min={80_000} max={140_000} step={1000} display={usd(strike)} onChange={setStrike} />
        <Slider label="Премия (в BTC)" value={premiumBtc} min={0.005} max={0.1} step={0.001} display={btc(premiumBtc, 3)} onChange={setPremiumBtc} />
        <Slider label="Цена BTC на экспирации" value={expiry} min={60_000} max={160_000} step={1000} display={usd(expiry)} accent="#3b82f6" onChange={setExpiry} />
      </div>
      <div className="stats">
        <Stat label="Премия в USD (при входе по $100k)" value={usd(premiumUsdAtEntry)} />
        <Stat label="Выплата на экспирации" value={`${btc(payoffBtcAt)} = ${usd(payoffBtcAt * expiry)}`} />
        <Stat label="P&L в BTC" value={btc(pnlBtcAt)} tone={pnlBtcAt >= 0 ? 'pos' : 'neg'} />
        <Stat label="P&L в USD" value={usd(pnlUsdAt)} tone={pnlUsdAt >= 0 ? 'pos' : 'neg'} />
      </div>
      <p className="hint">
        Заметь: глубоко в деньгах выплата в BTC стремится к 1 − K/S, но никогда не достигнет 1 BTC —
        чем выше цена, тем «дешевле» каждый доллар выплаты в биткоинах. Поэтому P&L-кривая инверсного
        колла в USD остаётся линейной, а в BTC — выпуклая и насыщается.
      </p>
    </div>
  )
}
