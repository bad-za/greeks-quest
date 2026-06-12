// Универсальный SVG-график: несколько линий, заливка прибыли/убытка к нулю, маркеры

export interface Series {
  points: [number, number][]
  color: string
  width?: number
  dash?: string
  /** залить область между линией и y=0: зелёным выше нуля, красным ниже */
  fillToZero?: boolean
  label?: string
}

export interface VMarker {
  x: number
  color: string
  label?: string
  dash?: string
}

export function XYChart(props: {
  series: Series[]
  vMarkers?: VMarker[]
  height?: number
  xFmt?: (x: number) => string
  yFmt?: (y: number) => string
  yZeroLine?: boolean
  xLabel?: string
}) {
  const W = 640
  const H = props.height ?? 300
  const PAD = { l: 56, r: 14, t: 14, b: 30 }
  const xFmt = props.xFmt ?? ((x: number) => String(Math.round(x)))
  const yFmt = props.yFmt ?? ((y: number) => String(Math.round(y)))

  const allPts = props.series.flatMap(s => s.points)
  if (allPts.length === 0) return null
  let xMin = Math.min(...allPts.map(p => p[0]))
  let xMax = Math.max(...allPts.map(p => p[0]))
  let yMin = Math.min(...allPts.map(p => p[1]))
  let yMax = Math.max(...allPts.map(p => p[1]))
  if (props.yZeroLine) {
    yMin = Math.min(yMin, 0)
    yMax = Math.max(yMax, 0)
  }
  const ySpan = yMax - yMin || 1
  yMin -= ySpan * 0.08
  yMax += ySpan * 0.08
  const xSpan = xMax - xMin || 1

  const sx = (x: number) => PAD.l + ((x - xMin) / xSpan) * (W - PAD.l - PAD.r)
  const sy = (y: number) => H - PAD.b - ((y - yMin) / (yMax - yMin)) * (H - PAD.t - PAD.b)

  const linePath = (pts: [number, number][]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`).join('')

  const areaPath = (pts: [number, number][]) =>
    linePath(pts) +
    `L${sx(pts[pts.length - 1][0]).toFixed(1)},${sy(0).toFixed(1)}` +
    `L${sx(pts[0][0]).toFixed(1)},${sy(0).toFixed(1)}Z`

  // тики
  const xTicks = 5
  const yTicks = 5
  const xTickVals = Array.from({ length: xTicks }, (_, i) => xMin + (xSpan * i) / (xTicks - 1))
  const yTickVals = Array.from({ length: yTicks }, (_, i) => yMin + ((yMax - yMin) * i) / (yTicks - 1))

  const zeroY = sy(0)
  const clipAboveId = `clip-above-${Math.round(zeroY)}`
  const clipBelowId = `clip-below-${Math.round(zeroY)}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img">
      <defs>
        <clipPath id={clipAboveId}>
          <rect x={0} y={0} width={W} height={Math.max(zeroY, 0)} />
        </clipPath>
        <clipPath id={clipBelowId}>
          <rect x={0} y={Math.max(zeroY, 0)} width={W} height={Math.max(H - zeroY, 0)} />
        </clipPath>
      </defs>

      {yTickVals.map((y, i) => (
        <g key={`yt${i}`}>
          <line x1={PAD.l} x2={W - PAD.r} y1={sy(y)} y2={sy(y)} className="grid-line" />
          <text x={PAD.l - 8} y={sy(y) + 4} className="tick" textAnchor="end">
            {yFmt(y)}
          </text>
        </g>
      ))}
      {xTickVals.map((x, i) => (
        <text key={`xt${i}`} x={sx(x)} y={H - PAD.b + 18} className="tick" textAnchor="middle">
          {xFmt(x)}
        </text>
      ))}

      {props.yZeroLine && (
        <line x1={PAD.l} x2={W - PAD.r} y1={zeroY} y2={zeroY} className="zero-line" />
      )}

      {props.series.map((s, i) =>
        s.fillToZero ? (
          <g key={`fill${i}`}>
            <path d={areaPath(s.points)} fill="#22c55e" opacity={0.16} clipPath={`url(#${clipAboveId})`} />
            <path d={areaPath(s.points)} fill="#ef4444" opacity={0.16} clipPath={`url(#${clipBelowId})`} />
          </g>
        ) : null,
      )}

      {props.vMarkers?.map((m, i) => (
        <g key={`vm${i}`}>
          <line
            x1={sx(m.x)}
            x2={sx(m.x)}
            y1={PAD.t}
            y2={H - PAD.b}
            stroke={m.color}
            strokeDasharray={m.dash ?? '4 4'}
            strokeWidth={1.2}
            opacity={0.8}
          />
          {m.label && (
            <text x={sx(m.x) + 4} y={PAD.t + 12} fill={m.color} className="marker-label">
              {m.label}
            </text>
          )}
        </g>
      ))}

      {props.series.map((s, i) => (
        <path
          key={`line${i}`}
          d={linePath(s.points)}
          fill="none"
          stroke={s.color}
          strokeWidth={s.width ?? 2.2}
          strokeDasharray={s.dash}
          strokeLinejoin="round"
        />
      ))}

      {props.series.some(s => s.label) && (
        <g>
          {props.series
            .filter(s => s.label)
            .map((s, i) => (
              <g key={`lg${i}`} transform={`translate(${PAD.l + 10 + i * 150}, ${PAD.t + 6})`}>
                <line x1={0} x2={18} y1={0} y2={0} stroke={s.color} strokeWidth={2.5} strokeDasharray={s.dash} />
                <text x={24} y={4} className="legend-label">
                  {s.label}
                </text>
              </g>
            ))}
        </g>
      )}
    </svg>
  )
}
