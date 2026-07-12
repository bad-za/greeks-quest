import { useEffect, useState } from 'react'
import { LEVELS, ACTS } from '../content/levels'
import { ACHIEVEMENTS } from '../content/achievements'
import { useStore, rankForXp } from '../state/store'
import { usd } from '../lib/format'
import { confirmDialog } from '../lib/telegram'

export function LevelMap(props: { onOpen: (levelId: string) => void }) {
  const { state, resetAll } = useStore()
  const [showAch, setShowAch] = useState(false)
  const rank = rankForXp(state.xp)

  // новичка заводим сразу в первый уровень, а не на карту из 12 карточек;
  // флаг в sessionStorage — чтобы «Назад» не зашвыривал обратно (сейв ещё пуст)
  useEffect(() => {
    const fresh =
      state.xp === 0 &&
      state.completedLevels.length === 0 &&
      Object.keys(state.progress).length === 0
    if (fresh && !sessionStorage.getItem('gq-auto-opened')) {
      sessionStorage.setItem('gq-auto-opened', '1')
      props.onOpen('intro')
    }
    // только при монтировании: реагировать на смену state/props не нужно
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const unlockedCount = state.achievements.length

  return (
    <div className="map">
      <header className="hud">
        <div className="hud-logo">
          <span className="hud-logo-mark">₿</span>
          <div>
            <b>Greeks Quest</b>
            <span>курс по крипто-опционам</span>
          </div>
        </div>
        <div className="hud-stats">
          <div className="hud-stat">
            <span>Портфель</span>
            <b className={state.balance >= 10_000 ? 'pos' : 'neg'}>{usd(state.balance)}</b>
          </div>
          <div className="hud-stat">
            <span>XP</span>
            <b>{state.xp}</b>
          </div>
          <div className="hud-stat">
            <span>Ранг</span>
            <b>
              {rank.emoji} {rank.name}
            </b>
          </div>
          <button className="btn ghost" onClick={() => setShowAch(true)}>
            🏅 {unlockedCount}/{ACHIEVEMENTS.length}
          </button>
        </div>
      </header>

      {state.busts > 0 && (
        <p className="busts">
          💀 Ликвидаций: {state.busts}. Депозит каждый раз восстанавливался до $10,000 — в реальной
          жизни такой кнопки нет.
        </p>
      )}

      {ACTS.map(act => {
        const actLevels = LEVELS.filter(l => l.act === act.num)
        return (
          <section key={act.num} className="act">
            <h2 className="act-title">
              <span className="act-num">Акт {act.num}</span> {act.title}
            </h2>
            <div className="level-grid">
              {actLevels.map(level => {
                const order = LEVELS.findIndex(l => l.id === level.id)
                const locked = order > 0 && !state.completedLevels.includes(LEVELS[order - 1].id)
                const done = state.completedLevels.includes(level.id)
                const progress = state.progress[level.id] ?? 0
                return (
                  <button
                    key={level.id}
                    className={`level-card ${locked ? 'locked' : ''} ${done ? 'done' : ''}`}
                    disabled={locked}
                    onClick={() => props.onOpen(level.id)}
                  >
                    <span className="level-emoji">{locked ? '🔒' : level.emoji}</span>
                    <b>{level.title}</b>
                    <span className="level-sub">{level.subtitle}</span>
                    <span className="level-progress">
                      {done
                        ? '✓ пройден'
                        : locked
                          ? 'заблокирован'
                          : progress > 0
                            ? `шаг ${Math.min(progress + 1, level.steps.length)} из ${level.steps.length}`
                            : `${level.steps.length} шагов`}
                    </span>
                    {!done && !locked && progress > 0 && (
                      <span className="level-bar">
                        <span style={{ width: `${(progress / level.steps.length) * 100}%` }} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}

      <footer className="map-foot">
        <button
          className="btn ghost danger"
          onClick={() => {
            confirmDialog('Сбросить весь прогресс, XP и баланс?').then(ok => {
              if (ok) resetAll()
            })
          }}
        >
          Сбросить прогресс
        </button>
        <p className="disclaimer">
          Учебный симулятор. Не является финансовым советом. Опционы — инструмент с высоким риском:
          покупатель может потерять всю премию, продавец — сильно больше.
        </p>
      </footer>

      {showAch && (
        <div className="modal-backdrop" onClick={() => setShowAch(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>🏅 Достижения</h3>
            <div className="ach-grid">
              {ACHIEVEMENTS.map(a => {
                const got = state.achievements.includes(a.id)
                return (
                  <div key={a.id} className={`ach ${got ? 'got' : ''}`}>
                    <span className="ach-emoji">{got ? a.emoji : '❔'}</span>
                    <div>
                      <b>{a.title}</b>
                      <span>{got ? a.desc : '???'}</span>
                    </div>
                  </div>
                )
              })}
            </div>
            <button className="btn" onClick={() => setShowAch(false)}>
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
