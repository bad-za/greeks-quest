import { useState, type ReactNode } from 'react'
import { findTerm } from '../content/glossary'
import { TermPopover } from './Glossary'
import { haptic } from '../lib/telegram'

export function Slider(props: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  display?: string
  onChange: (v: number) => void
  accent?: string
  /** пояснение «что это» — показывается по тапу на ? */
  hint?: string
}) {
  const [hintOpen, setHintOpen] = useState(false)
  return (
    <label className="slider">
      <span className="slider-head">
        <span>
          {props.label}
          {props.hint && (
            <button
              type="button"
              className="hint-btn"
              aria-label="Что это?"
              onClick={e => {
                e.preventDefault()
                e.stopPropagation()
                setHintOpen(h => !h)
              }}
            >
              ?
            </button>
          )}
        </span>
        <b style={props.accent ? { color: props.accent } : undefined}>
          {props.display ?? props.value}
        </b>
      </span>
      {props.hint && hintOpen && <span className="slider-hint">{props.hint}</span>}
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

function textOf(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (typeof node === 'object' && 'props' in node) {
    return textOf((node.props as { children?: ReactNode }).children)
  }
  return ''
}

/**
 * Термин в тексте. Если для него есть статья в словарике — тапается
 * и открывает определение; `t` задаёт ключ статьи явно, когда текст не совпадает.
 */
export function Term(props: { children: ReactNode; t?: string }) {
  const [open, setOpen] = useState(false)
  const entry = findTerm(props.t ?? textOf(props.children))
  if (!entry) return <b className="term">{props.children}</b>
  return (
    <>
      <button
        type="button"
        className="term tappable"
        onClick={() => {
          haptic('light')
          setOpen(true)
        }}
      >
        {props.children}
      </button>
      {open && <TermPopover entry={entry} onClose={() => setOpen(false)} />}
    </>
  )
}
