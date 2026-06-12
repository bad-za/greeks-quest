import { useState } from 'react'
import type { Level, Verdict } from '../content/types'
import { useStore } from '../state/store'
import { Quiz } from './Quiz'
import { Mission } from './Mission'
import { LEVELS } from '../content/levels'
import { haptic } from '../lib/telegram'

const STEP_XP = { theory: 10, widget: 15, quiz: 30, mission: 0 } // миссии дают XP по вердикту
const MISSION_XP: Record<Verdict, number> = { best: 120, ok: 70, bad: 30 }

export function LevelPlayer(props: { level: Level; onExit: () => void }) {
  const { state, addXp, addPnl, setStepProgress, completeLevel, unlock } = useStore()
  const level = props.level
  const saved = state.progress[level.id] ?? 0
  const [idx, setIdx] = useState(Math.min(saved, level.steps.length - 1))
  const [stepReady, setStepReady] = useState(idx < saved) // квиз/миссия текущего шага завершены?
  const [finished, setFinished] = useState(false)

  const step = level.steps[idx]
  const isDone = idx < saved
  const isLast = idx === level.steps.length - 1
  const needsAction = (step.kind === 'quiz' || step.kind === 'mission') && !isDone && !stepReady

  function completeStep() {
    haptic('light')
    if (!isDone) {
      setStepProgress(level.id, idx + 1)
      if (step.kind === 'theory' || step.kind === 'widget') addXp(STEP_XP[step.kind])
    }
    if (isLast) {
      finishLevel()
    } else {
      setIdx(i => i + 1)
      setStepReady(idx + 1 < saved)
      window.scrollTo({ top: 0 })
    }
  }

  function finishLevel() {
    haptic('success')
    if (!state.completedLevels.includes(level.id)) {
      addXp(50)
      completeLevel(level.id)
      const order = LEVELS.findIndex(l => l.id === level.id)
      if (order === 0) unlock('first-steps')
      // ачивки за завершение актов
      const actLevels = LEVELS.filter(l => l.act === level.act)
      const actDone = actLevels.every(
        l => l.id === level.id || state.completedLevels.includes(l.id),
      )
      if (actDone) {
        if (level.act === 2) unlock('greeks')
        if (level.act === 3) unlock('strategist')
        if (level.act === 4) unlock('vol-whisperer')
      }
      if (level.id === 'final') unlock('survivor')
    }
    setFinished(true)
  }

  function onQuizComplete(perfect: boolean) {
    if (!isDone) {
      addXp(STEP_XP.quiz + (perfect ? 20 : 0))
      if (perfect) unlock('quiz-ace')
    }
    setStepReady(true)
  }

  function onMissionComplete(verdict: Verdict, pnl: number) {
    if (!isDone) {
      addXp(MISSION_XP[verdict])
      addPnl(pnl)
      unlock('first-trade')
      if (pnl > 0) unlock('profit')
      if (verdict === 'best') unlock('best-trade')
      if (state.balance + pnl > 15_000) unlock('whale')
    }
    setStepReady(true)
  }

  if (finished) {
    return (
      <div className="level-done">
        <div className="level-done-emoji">{level.emoji}</div>
        <h2>Уровень пройден!</h2>
        <p>{level.title}</p>
        <button className="btn primary" onClick={props.onExit}>На карту курса →</button>
      </div>
    )
  }

  return (
    <div className="player">
      <header className="player-head">
        <button className="btn ghost" onClick={props.onExit}>← Карта</button>
        <div className="player-title">
          <span>{level.emoji} {level.title}</span>
          <div className="step-dots">
            {level.steps.map((s, i) => (
              <span
                key={i}
                className={`dot ${i < saved ? 'done' : ''} ${i === idx ? 'cur' : ''}`}
                title={`Шаг ${i + 1}`}
              />
            ))}
          </div>
        </div>
        <span className="player-step">{idx + 1}/{level.steps.length}</span>
      </header>

      <div className="step-card">
        {step.kind === 'theory' && (
          <>
            <h3>{step.title}</h3>
            <div className="theory-body">{step.body}</div>
          </>
        )}
        {step.kind === 'widget' && (
          <>
            <h3>🔬 {step.title}</h3>
            {step.body && <div className="theory-body">{step.body}</div>}
            {step.task && <div className="task">🎯 Задание: {step.task}</div>}
            {step.widget}
          </>
        )}
        {step.kind === 'quiz' && (
          <>
            <h3>🧠 {step.title}</h3>
            <Quiz key={`${level.id}-${idx}`} questions={step.questions} alreadyDone={isDone} onComplete={onQuizComplete} />
          </>
        )}
        {step.kind === 'mission' && (
          <Mission key={`${level.id}-${idx}`} mission={step.mission} alreadyDone={isDone} onComplete={onMissionComplete} />
        )}
      </div>

      <footer className="player-foot">
        <button className="btn ghost" disabled={idx === 0} onClick={() => { setIdx(i => i - 1); setStepReady(true) }}>
          ← Назад
        </button>
        <button className="btn primary" disabled={needsAction} onClick={completeStep}>
          {needsAction
            ? step.kind === 'quiz' ? 'Сначала ответь на вопросы' : 'Сначала прими решение'
            : isLast ? 'Завершить уровень ✓' : 'Дальше →'}
        </button>
      </footer>
    </div>
  )
}
