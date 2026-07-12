import { useEffect, useState } from 'react'
import { StoreProvider } from './state/store'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LevelMap } from './components/LevelMap'
import { LevelPlayer } from './components/LevelPlayer'
import { LEVELS } from './content/levels'
import { initTelegram, showBack, hideBack, isTMA, tgUserId } from './lib/telegram'

// приватная бета: доступ только этим Telegram-аккаунтам
const ALLOWED_USERS = [217_306_978]

function hasAccess(): boolean {
  // локальная разработка — без ограничений
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return true
  // внутри Telegram — только разрешённые аккаунты
  if (isTMA) {
    const id = tgUserId()
    return id !== null && ALLOWED_USERS.includes(id)
  }
  // прямое открытие продакшен-URL в браузере — закрыто
  return false
}

function Locked() {
  return (
    <div className="level-done">
      <div className="level-done-emoji">🔒</div>
      <h2>Приватная бета</h2>
      <p className="mut">
        Greeks Quest пока доступен только владельцу.
        <br />
        Открой приложение через Telegram-бота @GreeksQuest_bot.
      </p>
    </div>
  )
}

export default function App() {
  const [levelId, setLevelId] = useState<string | null>(null)
  const level = levelId ? LEVELS.find(l => l.id === levelId) : null

  useEffect(() => {
    initTelegram()
  }, [])

  // внутри уровня — нативная телеграмовская кнопка «Назад»
  useEffect(() => {
    if (levelId) showBack(() => setLevelId(null))
    else hideBack()
    return hideBack
  }, [levelId])

  if (!hasAccess()) {
    return (
      <div className="app">
        <Locked />
      </div>
    )
  }

  return (
    <StoreProvider>
      <div className="app">
        <ErrorBoundary>
          {level ? (
            <LevelPlayer key={level.id} level={level} onExit={() => setLevelId(null)} />
          ) : (
            <LevelMap onOpen={setLevelId} />
          )}
        </ErrorBoundary>
      </div>
    </StoreProvider>
  )
}
