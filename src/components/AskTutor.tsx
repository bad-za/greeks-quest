import { useEffect, useRef, useState } from 'react'
import { askTutor, type ChatMsg } from '../lib/ask'
import { haptic } from '../lib/telegram'

const STARTERS = [
  'Что такое страйк простыми словами?',
  'Чем колл отличается от пута?',
  'Почему премия именно такая?',
  'Не понимаю задание — объясни проще',
]

/** Чат с AI-тьютором: можно задать уточняющий вопрос про текущий шаг курса */
export function AskTutor(props: { context: string; onClose: () => void }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [msgs, busy])

  async function send(text: string) {
    const question = text.trim()
    if (!question || busy) return
    haptic('light')
    setError(null)
    setInput('')
    const history = msgs
    setMsgs(m => [...m, { role: 'user', content: question }])
    setBusy(true)
    try {
      const answer = await askTutor(question, props.context, history)
      setMsgs(m => [...m, { role: 'assistant', content: answer }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Что-то пошло не так')
      setMsgs(history) // вопрос не дошёл — вернём его в поле ввода
      setInput(question)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={props.onClose}>
      <div className="modal ask-modal" onClick={e => e.stopPropagation()}>
        <h3>💬 Спросить тьютора</h3>
        <div className="chat" ref={listRef}>
          {msgs.length === 0 && (
            <div className="chat-empty">
              <p className="mut">
                Непонятен термин или само задание? Спрашивай как угодно — отвечу с учётом шага, на
                котором ты сейчас.
              </p>
              <div className="chat-starters">
                {STARTERS.map(s => (
                  <button key={s} className="chip" onClick={() => send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={`chat-msg ${m.role}`}>
              {m.content}
            </div>
          ))}
          {busy && <div className="chat-msg assistant typing">думаю…</div>}
          {error && <div className="chat-error">{error}</div>}
        </div>
        <div className="chat-input">
          <input
            value={input}
            placeholder="Твой вопрос…"
            enterKeyHint="send"
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') send(input)
            }}
          />
          <button
            className="btn primary"
            disabled={busy || !input.trim()}
            onClick={() => send(input)}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  )
}
