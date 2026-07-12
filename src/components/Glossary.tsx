import { useState } from 'react'
import { GLOSSARY, type GlossEntry } from '../content/glossary'
import { haptic } from '../lib/telegram'

/** Попап с определением одного термина (открывается тапом по подсвеченному слову) */
export function TermPopover(props: { entry: GlossEntry; onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={props.onClose}>
      <div className="modal term-modal" onClick={e => e.stopPropagation()}>
        <h3>📖 {props.entry.title}</h3>
        <p className="term-body">{props.entry.body}</p>
        <button className="btn primary" onClick={props.onClose}>
          Понятно
        </button>
      </div>
    </div>
  )
}

/** Полный словарик с поиском — кнопка 📖 в шапке уровня */
export function GlossaryModal(props: { onClose: () => void }) {
  const [q, setQ] = useState('')
  const [openKey, setOpenKey] = useState<string | null>(null)
  const query = q.toLowerCase().trim()
  const list = query
    ? GLOSSARY.filter(
        e =>
          e.title.toLowerCase().includes(query) ||
          e.aliases.some(a => a.includes(query)) ||
          e.body.toLowerCase().includes(query),
      )
    : GLOSSARY

  return (
    <div className="modal-backdrop" onClick={props.onClose}>
      <div className="modal glossary" onClick={e => e.stopPropagation()}>
        <h3>📖 Словарик</h3>
        <input
          className="gloss-search"
          type="search"
          placeholder="Найти термин: страйк, колл, IV…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        <div className="gloss-list">
          {list.map(e => (
            <div key={e.key} className={openKey === e.key ? 'gloss-item open' : 'gloss-item'}>
              <button
                className="gloss-term"
                onClick={() => {
                  haptic('light')
                  setOpenKey(k => (k === e.key ? null : e.key))
                }}
              >
                {e.title}
              </button>
              {openKey === e.key && <p className="gloss-body">{e.body}</p>}
            </div>
          ))}
          {!list.length && (
            <p className="mut">
              Ничего не нашлось. Возможно, это понятие встретится дальше в курсе 🙂
            </p>
          )}
        </div>
        <button className="btn" onClick={props.onClose}>
          Закрыть
        </button>
      </div>
    </div>
  )
}
