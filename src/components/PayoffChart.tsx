import { XYChart, type Series, type VMarker } from './XYChart'
import { legsPnl, type Leg } from '../lib/bs'
import { usd } from '../lib/format'

export interface SpotLeg {
  /** количество BTC, купленных по цене entry */
  qty: number
  entry: number
}

export function positionPnl(
  legs: Leg[],
  spotLeg: SpotLeg | undefined,
  S: number,
  iv: number,
  daysLeft: number,
): number {
  let pnl = legsPnl(legs, S, iv, daysLeft)
  if (spotLeg) pnl += spotLeg.qty * (S - spotLeg.entry)
  return pnl
}

/** Находит точки безубыточности на экспирации (численно) */
export function breakevens(
  legs: Leg[],
  spotLeg: SpotLeg | undefined,
  xMin: number,
  xMax: number,
): number[] {
  const result: number[] = []
  const N = 400
  let prev = positionPnl(legs, spotLeg, xMin, 0.0001, 0)
  for (let i = 1; i <= N; i++) {
    const x = xMin + ((xMax - xMin) * i) / N
    const cur = positionPnl(legs, spotLeg, x, 0.0001, 0)
    if ((prev < 0 && cur >= 0) || (prev >= 0 && cur < 0)) {
      // линейная интерполяция
      const x0 = xMin + ((xMax - xMin) * (i - 1)) / N
      const t = prev === cur ? 0 : prev / (prev - cur)
      result.push(x0 + t * (x - x0))
    }
    prev = cur
  }
  return result
}

export function PayoffChart(props: {
  legs: Leg[]
  spotLeg?: SpotLeg
  /** текущая цена BTC — синий маркер */
  spot: number
  /** IV в долях для кривой «сегодня» */
  iv: number
  /** дней до экспирации для кривой «сегодня»; 0 = не рисовать */
  daysLeft: number
  xMin: number
  xMax: number
  height?: number
}) {
  const N = 160
  const expiry: [number, number][] = []
  const today: [number, number][] = []
  for (let i = 0; i <= N; i++) {
    const x = props.xMin + ((props.xMax - props.xMin) * i) / N
    expiry.push([x, positionPnl(props.legs, props.spotLeg, x, props.iv, 0)])
    if (props.daysLeft > 0) {
      today.push([x, positionPnl(props.legs, props.spotLeg, x, props.iv, props.daysLeft)])
    }
  }

  const series: Series[] = [
    { points: expiry, color: '#e2e8f0', width: 2.4, fillToZero: true, label: 'На экспирации' },
  ]
  if (today.length) {
    series.push({
      points: today,
      color: '#f59e0b',
      dash: '6 4',
      width: 2,
      label: `Сегодня (${props.daysLeft}д до эксп.)`,
    })
  }

  const markers: VMarker[] = [{ x: props.spot, color: '#3b82f6', label: 'BTC' }]
  for (const be of breakevens(props.legs, props.spotLeg, props.xMin, props.xMax)) {
    markers.push({ x: be, color: '#22c55e', label: 'BE', dash: '2 3' })
  }
  const strikes = [...new Set(props.legs.map(l => l.strike))]
  for (const k of strikes) {
    markers.push({ x: k, color: '#64748b', dash: '2 4' })
  }

  return (
    <XYChart
      series={series}
      vMarkers={markers}
      yZeroLine
      height={props.height}
      xFmt={x => `${Math.round(x / 1000)}k`}
      yFmt={y => usd(y)}
    />
  )
}
