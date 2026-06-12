import { useEffect, useState } from 'react'
import { StoreProvider } from './state/store'
import { LevelMap } from './components/LevelMap'
import { LevelPlayer } from './components/LevelPlayer'
import { LEVELS } from './content/levels'
import { initTelegram, showBack, hideBack } from './lib/telegram'

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

  return (
    <StoreProvider>
      <div className="app">
        {level ? (
          <LevelPlayer key={level.id} level={level} onExit={() => setLevelId(null)} />
        ) : (
          <LevelMap onOpen={setLevelId} />
        )}
      </div>
    </StoreProvider>
  )
}
