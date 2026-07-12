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
): Promise<string> {
  const res = await fetch(`${ASK_API}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData: tg?.initData ?? '', question, context, history }),
  })
  const data = (await res.json().catch(() => null)) as { answer?: string; error?: string } | null
  if (!res.ok || !data?.answer) throw new Error(data?.error ?? `Ошибка сети (${res.status})`)
  return data.answer
}
