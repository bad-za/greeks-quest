import type { ReactNode } from 'react'

export function Slider(props: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  display?: string
  onChange: (v: number) => void
  accent?: string
}) {
  return (
    <label className="slider">
      <span className="slider-head">
        <span>{props.label}</span>
        <b style={props.accent ? { color: props.accent } : undefined}>
          {props.display ?? props.value}
        </b>
      </span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={props.value}
        onChange={e => props.onChange(Number(e.target.value))}
      />
    </label>
  )
}

export function Seg<T extends string>(props: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="seg">
      {props.options.map(o => (
        <button
          key={o.value}
          className={o.value === props.value ? 'seg-btn active' : 'seg-btn'}
          onClick={() => props.onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Stat(props: { label: string; value: string; tone?: 'pos' | 'neg' | 'mut' }) {
  return (
    <div className="stat">
      <span className="stat-label">{props.label}</span>
      <span className={`stat-value ${props.tone ?? ''}`}>{props.value}</span>
    </div>
  )
}

export function Callout(props: { type?: 'info' | 'warn' | 'tip'; children: ReactNode }) {
  const icons = { info: 'ℹ️', warn: '⚠️', tip: '💡' }
  const t = props.type ?? 'info'
  return (
    <div className={`callout callout-${t}`}>
      <span className="callout-icon">{icons[t]}</span>
      <div>{props.children}</div>
    </div>
  )
}

export function Term(props: { children: ReactNode }) {
  return <b className="term">{props.children}</b>
}
