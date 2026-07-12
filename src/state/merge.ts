import type { SaveState } from './store'

/**
 * Слияние локального сейва с облачным (Telegram CloudStorage).
 * База — сейв с бóльшим XP (при равенстве — локальный): из неё берутся xp и balance.
 * Всё перечислимое объединяется, чтобы игра с двух устройств не теряла прогресс:
 * completedLevels/achievements — union, progress — поэлементный max, busts — max.
 */
export function mergeSaves(local: SaveState, cloud: SaveState): SaveState {
  const base = cloud.xp > local.xp ? cloud : local
  const other = base === cloud ? local : cloud

  const progress: Record<string, number> = { ...other.progress }
  for (const [levelId, step] of Object.entries(base.progress)) {
    progress[levelId] = Math.max(progress[levelId] ?? 0, step)
  }

  return {
    ...base,
    progress,
    completedLevels: [...new Set([...base.completedLevels, ...other.completedLevels])],
    achievements: [...new Set([...base.achievements, ...other.achievements])],
    busts: Math.max(base.busts, other.busts),
  }
}
