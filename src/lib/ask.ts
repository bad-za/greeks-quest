// Клиент AI-тьютора (Cloudflare Worker, см. worker/). Ключ API живёт только на воркере.
import { tg } from './telegram'

/**
 * URL воркера-тьютора. Пустая строка = фича выключена (кнопка не показывается).
 * Заполняется после `npx wrangler deploy` (URL вида https://greeks-quest-tutor.<account>.workers.dev).
 */
const PROD_TUTOR_URL = 'https://greeks-quest-tutor.bigbadnoob.workers.dev'

export const ASK_API = import.meta.env.DEV ? 'http://localhost:8787' : PROD_TUTOR_URL

export interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

export async function askTutor(
  question: string,
  context: string,
  history: ChatMsg[],
  onDelta?: (full: string) => void,
): Promise<string> {
  const res = await fetch(`${ASK_API}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData: tg?.initData ?? '', question, context, history, stream: true }),
  })
  // ошибки (и старый воркер без стриминга) приходят JSON'ом, поток — text/plain
  if ((res.headers.get('Content-Type') ?? '').includes('application/json')) {
    const data = (await res.json().catch(() => null)) as { answer?: string; error?: string } | null
    if (!res.ok || !data?.answer) throw new Error(data?.error ?? `Ошибка сети (${res.status})`)
    return data.answer
  }
  if (!res.ok || !res.body) throw new Error(`Ошибка сети (${res.status})`)
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    full += decoder.decode(value, { stream: true })
    onDelta?.(full)
  }
  full += decoder.decode()
  if (!full.trim()) throw new Error('Тьютор не ответил — попробуй ещё раз')
  return full
}
