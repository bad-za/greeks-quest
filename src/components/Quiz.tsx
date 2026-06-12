import { useState } from 'react'
import type { QuizQuestion } from '../content/types'
import { haptic } from '../lib/telegram'

export function Quiz(props: {
  questions: QuizQuestion[]
  alreadyDone: boolean
  onComplete: (perfect: boolean) => void
}) {
  const [selected, setSelected] = useState<(number | null)[]>(props.questions.map(() => null))
  const [checked, setChecked] = useState<boolean[]>(props.questions.map(() => false))
  const [hadMistake, setHadMistake] = useState(false)
  const [done, setDone] = useState(props.alreadyDone)

  const allCorrect = props.questions.every((q, i) => checked[i] && selected[i] === q.correct)

  function check(qi: number) {
    setChecked(c => c.map((v, i) => (i === qi ? true : v)))
    const correct = selected[qi] === props.questions[qi].correct
    haptic(correct ? 'success' : 'error')
    if (!correct) setHadMistake(true)
  }

  function retry(qi: number) {
    setChecked(c => c.map((v, i) => (i === qi ? false : v)))
    setSelected(s => s.map((v, i) => (i === qi ? null : v)))
  }

  return (
    <div className="quiz">
      {props.questions.map((q, qi) => {
        const sel = selected[qi]
        const isChecked = checked[qi]
        const correct = isChecked && sel === q.correct
        return (
          <div key={qi} className="quiz-q">
            <p className="quiz-question">
              <span className="quiz-num">{qi + 1}</span>
              {q.question}
            </p>
            <div className="quiz-options">
              {q.options.map((o, oi) => {
                let cls = 'quiz-opt'
                if (isChecked && oi === q.correct && sel === oi) cls += ' correct'
                else if (isChecked && sel === oi) cls += ' wrong'
                else if (sel === oi) cls += ' selected'
                return (
                  <button
                    key={oi}
                    className={cls}
                    disabled={isChecked && correct}
                    onClick={() => !isChecked && setSelected(s => s.map((v, i) => (i === qi ? oi : v)))}
                  >
                    {o}
                  </button>
                )
              })}
            </div>
            {!isChecked && sel !== null && (
              <button className="btn" onClick={() => check(qi)}>Проверить</button>
            )}
            {isChecked && correct && <p className="quiz-explain ok">✅ {q.explain}</p>}
            {isChecked && !correct && (
              <div>
                <p className="quiz-explain bad">❌ Не совсем. Подумай ещё раз.</p>
                <button className="btn" onClick={() => retry(qi)}>Попробовать снова</button>
              </div>
            )}
          </div>
        )
      })}
      {allCorrect && !done && (
        <button
          className="btn primary"
          onClick={() => {
            setDone(true)
            props.onComplete(!hadMistake)
          }}
        >
          {hadMistake ? 'Готово ✓' : 'Всё верно с первой попытки! 🎯 Забрать бонус'}
        </button>
      )}
      {done && <p className="quiz-explain ok">Квиз пройден ✓</p>}
    </div>
  )
}
