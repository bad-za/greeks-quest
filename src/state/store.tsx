import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { cloudGet, cloudSet } from '../lib/telegram'
import { mergeSaves } from './merge'

export interface SaveState {
  xp: number
  balance: number
  /** levelId -> индекс следующего непройденного шага */
  progress: Record<string, number>
  completedLevels: string[]
  achievements: string[]
  /** счётчик ликвидаций (обнулений депозита) */
  busts: number
}

const INITIAL: SaveState = {
  xp: 0,
  balance: 10_000,
  progress: {},
  completedLevels: [],
  achievements: [],
  busts: 0,
}

const KEY = 'greeks-quest-save-v1'

function load(): SaveState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return INITIAL
    return { ...INITIAL, ...JSON.parse(raw) }
  } catch {
    return INITIAL
  }
}

interface Store {
  state: SaveState
  addXp: (n: number) => void
  addPnl: (n: number) => void
  setStepProgress: (levelId: string, step: number) => void
  completeLevel: (levelId: string) => void
  unlock: (achievementId: string) => void
  resetAll: () => void
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SaveState>(load)
  const hydrated = useRef(false)

  // подтянуть сейв из Telegram CloudStorage (другое устройство / переустановка)
  // и честно слить с локальным — union прогресса вместо «кто больше, тот и прав»
  useEffect(() => {
    cloudGet(KEY).then(raw => {
      hydrated.current = true
      if (!raw) return
      try {
        const cloud: SaveState = { ...INITIAL, ...JSON.parse(raw) }
        setState(local => mergeSaves(local, cloud))
      } catch {
        /* битый сейв в облаке — игнорируем */
      }
    })
  }, [])

  useEffect(() => {
    const json = JSON.stringify(state)
    localStorage.setItem(KEY, json)
    // не затирать облако начальным состоянием, пока не попробовали его прочитать
    if (hydrated.current) cloudSet(KEY, json)
  }, [state])

  const store: Store = {
    state,
    addXp: n => setState(s => ({ ...s, xp: s.xp + n })),
    addPnl: n =>
      setState(s => {
        let balance = s.balance + n
        let busts = s.busts
        let achievements = s.achievements
        if (balance <= 0) {
          // ликвидация: депозит сгорел, начинаем заново — как в реальной жизни, только бесплатно
          balance = 10_000
          busts += 1
          if (!achievements.includes('rekt')) achievements = [...achievements, 'rekt']
        }
        return { ...s, balance, busts, achievements }
      }),
    setStepProgress: (levelId, step) =>
      setState(s => ({
        ...s,
        progress: { ...s.progress, [levelId]: Math.max(s.progress[levelId] ?? 0, step) },
      })),
    completeLevel: levelId =>
      setState(s =>
        s.completedLevels.includes(levelId)
          ? s
          : { ...s, completedLevels: [...s.completedLevels, levelId] },
      ),
    unlock: id =>
      setState(s =>
        s.achievements.includes(id) ? s : { ...s, achievements: [...s.achievements, id] },
      ),
    resetAll: () => setState(INITIAL),
  }

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const store = useContext(Ctx)
  if (!store) throw new Error('useStore outside provider')
  return store
}

export function rankForXp(xp: number): { name: string; emoji: string } {
  if (xp >= 3000) return { name: 'Волатильность во плоти', emoji: '🐉' }
  if (xp >= 2200) return { name: 'Маркет-мейкер', emoji: '🦈' }
  if (xp >= 1500) return { name: 'Грек-мастер', emoji: '🧙' }
  if (xp >= 900) return { name: 'Тета-фермер', emoji: '🧑‍🌾' }
  if (xp >= 450) return { name: 'Дельта-охотник', emoji: '🏹' }
  if (xp >= 150) return { name: 'Опционный падаван', emoji: '🐣' }
  return { name: 'Новичок', emoji: '🥚' }
}
