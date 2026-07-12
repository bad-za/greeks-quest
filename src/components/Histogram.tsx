/**
 * Гистограмма распределения P&L (Монте-Карло). Полярность закодирована
 * позицией относительно нулевой линии; цвет (--pos/--neg) — вторичное кодирование.
 */
export function Histogram(props: { values: number[]; height?: number }) {
  const W = 640
  const H = props.height ?? 170
  const PAD = { l: 6, r: 6, t: 10, b: 22 }
  const BINS = 24

  const values = props.values
  if (values.length === 0) return null

  // ноль всегда в домене, чтобы линия «безубытка» была видна
  const lo = Math.min(Math.min(...values), 0)
  const hi = Math.max(Math.max(...values), 0)
  const span = hi - lo || 1
  const counts = new Array<number>(BINS).fill(0)
  for (const v of values) {
    const bin = Math.min(BINS - 1, Math.floor(((v - lo) / span) * BINS))
    counts[bin]++
  }
  const maxCount = Math.max(...counts)

  const plotW = W - PAD.l - PAD.r
  const plotH = H - PAD.t - PAD.b
  const binW = plotW / BINS
  const x = (v: number) => PAD.l + ((v - lo) / span) * plotW

  const fmt = (v: number) =>
    Math.abs(v) >= 1000 ? `${v > 0 ? '+' : ''}${(v / 1000).toFixed(1)}k` : `${v > 0 ? '+' : ''}${Math.round(v)}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="histogram" role="img" aria-label="Распределение P&L">
      {counts.map((c, i) => {
        if (c === 0) return null
        const h = (c / maxCount) * plotH
        const center = lo + ((i + 0.5) / BINS) * span
        return (
          <rect
            key={i}
            x={PAD.l + i * binW + 1}
            y={PAD.t + plotH - h}
            width={binW - 2}
            height={h}
            rx={2}
            fill={center >= 0 ? 'var(--pos)' : 'var(--neg)'}
            opacity={0.85}
          />
        )
      })}
      {/* нулевая линия — безубыток */}
      <line
        x1={x(0)}
        y1={PAD.t - 4}
        x2={x(0)}
        y2={PAD.t + plotH + 4}
        stroke="var(--mut)"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <line
        x1={PAD.l}
        y1={PAD.t + plotH}
        x2={W - PAD.r}
        y2={PAD.t + plotH}
        stroke="var(--border)"
        strokeWidth={1}
      />
      <text x={PAD.l} y={H - 6} fill="var(--mut)" fontSize={11}>
        {fmt(lo)}
      </text>
      <text x={x(0)} y={H - 6} fill="var(--mut)" fontSize={11} textAnchor="middle">
        0
      </text>
      <text x={W - PAD.r} y={H - 6} fill="var(--mut)" fontSize={11} textAnchor="end">
        {fmt(hi)}
      </text>
    </svg>
  )
}
