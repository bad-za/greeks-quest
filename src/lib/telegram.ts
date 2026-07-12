// Обёртка над Telegram WebApp SDK. Приложение работает и в браузере, и внутри Telegram —
// все вызовы безопасно деградируют, если SDK недоступен.

interface TgBackButton {
  show(): void
  hide(): void
  onClick(cb: () => void): void
  offClick(cb: () => void): void
}

interface TgHaptic {
  notificationOccurred(type: 'success' | 'error' | 'warning'): void
  impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void
}

interface TgCloudStorage {
  getItem(key: string, cb: (err: unknown, value?: string | null) => void): void
  setItem(key: string, value: string, cb?: (err: unknown, ok?: boolean) => void): void
}

interface TgWebApp {
  initData: string
  initDataUnsafe?: { user?: { id?: number } }
  platform: string
  ready(): void
  expand(): void
  setHeaderColor(color: string): void
  setBackgroundColor(color: string): void
  disableVerticalSwipes?: () => void
  showConfirm?: (message: string, cb: (ok: boolean) => void) => void
  BackButton: TgBackButton
  HapticFeedback: TgHaptic
  CloudStorage?: TgCloudStorage
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp }
  }
}

// typeof-проверка: модуль импортируется и в Node (vitest), где window нет
export const tg: TgWebApp | undefined =
  typeof window === 'undefined' ? undefined : window.Telegram?.WebApp

/** Запущены ли мы реально внутри Telegram (скрипт SDK определяет объект даже в обычном браузере) */
export const isTMA =
  !!tg && (tg.initData !== '' || (tg.platform !== '' && tg.platform !== 'unknown'))

/** ID пользователя Telegram, открывшего мини-апп (null вне Telegram) */
export function tgUserId(): number | null {
  return tg?.initDataUnsafe?.user?.id ?? null
}

export function initTelegram(): void {
  if (!tg || !isTMA) return
  try {
    tg.ready()
    tg.expand()
    tg.setHeaderColor('#0b0f17')
    tg.setBackgroundColor('#0b0f17')
    tg.disableVerticalSwipes?.()
  } catch {
    // старые клиенты могут не знать часть методов — не критично
  }
}

export function haptic(type: 'success' | 'error' | 'warning' | 'light' | 'medium'): void {
  if (!tg || !isTMA) return
  try {
    if (type === 'light' || type === 'medium') tg.HapticFeedback.impactOccurred(type)
    else tg.HapticFeedback.notificationOccurred(type)
  } catch {
    /* noop */
  }
}

let backCb: (() => void) | null = null

export function showBack(onClick: () => void): void {
  if (!tg || !isTMA) return
  try {
    if (backCb) tg.BackButton.offClick(backCb)
    backCb = onClick
    tg.BackButton.onClick(onClick)
    tg.BackButton.show()
  } catch {
    /* noop */
  }
}

export function hideBack(): void {
  if (!tg || !isTMA) return
  try {
    if (backCb) tg.BackButton.offClick(backCb)
    backCb = null
    tg.BackButton.hide()
  } catch {
    /* noop */
  }
}

/** confirm(), работающий и в Telegram (где window.confirm заблокирован), и в браузере */
export function confirmDialog(message: string): Promise<boolean> {
  if (tg && isTMA && tg.showConfirm) {
    return new Promise(resolve => {
      try {
        tg.showConfirm!(message, ok => resolve(ok))
      } catch {
        resolve(window.confirm(message))
      }
    })
  }
  return Promise.resolve(window.confirm(message))
}

export function cloudGet(key: string): Promise<string | null> {
  if (!tg || !isTMA || !tg.CloudStorage) return Promise.resolve(null)
  return new Promise(resolve => {
    try {
      tg.CloudStorage!.getItem(key, (err, value) => resolve(err ? null : (value ?? null)))
    } catch {
      resolve(null)
    }
  })
}

export function cloudSet(key: string, value: string): void {
  if (!tg || !isTMA || !tg.CloudStorage) return
  try {
    tg.CloudStorage.setItem(key, value)
  } catch {
    /* noop */
  }
}
