// AI-тьютор Greeks Quest: Cloudflare Worker — единственное место, где живёт ключ API.
// Авторизация: криптографическая проверка подписи Telegram initData токеном бота
// (в отличие от клиентского allowlist в App.tsx, подделать её нельзя).
import Anthropic from '@anthropic-ai/sdk'

export interface Env {
  ANTHROPIC_API_KEY: string
  BOT_TOKEN: string
  /** Telegram user ID через запятую */
  ALLOWED_USERS: string
  /** "1" — пропускать проверку initData (только для wrangler dev, задаётся в .dev.vars) */
  DEV_MODE?: string
}

const ALLOWED_ORIGINS = new Set([
  'https://bad-za.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
])

const MODEL = 'claude-sonnet-4-6'

const SYSTEM = `Ты — тьютор обучающей игры Greeks Quest про опционы на криптовалюты (BTC/ETH, биржа Deribit).
Ученик проходит курс: акт I — основы (коллы, путы, премия, страйк, экспирация, инверсные опционы),
акт II — греки и IV, акт III — стратегии (спреды, covered call, стрэддлы, кондоры), акт IV — улыбка, скью, риск-менеджмент.

Правила ответов:
- Отвечай по-русски, просто и дружелюбно, как объяснил бы новичку. Термины из курса (страйк, премия, колл...) можно использовать, но новые понятия сразу расшифровывай.
- Коротко: 2–6 предложений. Один маленький числовой пример с BTC, если он помогает (например: «купил колл 105k за $4,000...»).
- Если вопрос про понятие из более позднего акта — ответь в одну-две фразы и скажи, что подробно это будет дальше в курсе.
- Не давай финансовых советов, не оценивай «стоит ли покупать». Учебные объяснения — да, рекомендации по реальным сделкам — нет.
- Если вопрос вообще не про опционы/трейдинг/курс — вежливо скажи, что ты тьютор курса, и предложи спросить про текущее задание.
- Пользователю показывается контекст задания, на котором он застрял, — учитывай его в ответе.`

function cors(origin: string | null): Record<string, string> {
  const o = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://bad-za.github.io'
  return {
    'Access-Control-Allow-Origin': o,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(origin) },
  })
}

async function hmacSha256(key: Uint8Array | ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data))
}

/** Проверяет подпись Telegram initData; возвращает user id или null */
async function validateInitData(initData: string, botToken: string): Promise<number | null> {
  if (!initData) return null
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return null
  params.delete('hash')
  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n')
  const secret = await hmacSha256(new TextEncoder().encode('WebAppData'), botToken)
  const sig = new Uint8Array(await hmacSha256(secret, dataCheckString))
  const hex = [...sig].map(b => b.toString(16).padStart(2, '0')).join('')
  if (hex !== hash) return null
  // подпись валидна не дольше суток — защита от повторного использования утёкшего initData
  const authDate = Number(params.get('auth_date') ?? 0)
  if (!authDate || Date.now() / 1000 - authDate > 86_400) return null
  try {
    const user = JSON.parse(params.get('user') ?? '') as { id?: number }
    return typeof user.id === 'number' ? user.id : null
  } catch {
    return null
  }
}

interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

interface AskRequest {
  initData?: string
  question?: string
  context?: string
  history?: ChatMsg[]
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin')
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) })

    const url = new URL(request.url)
    if (request.method !== 'POST' || url.pathname !== '/ask') {
      return json({ error: 'not found' }, 404, origin)
    }

    let body: AskRequest
    try {
      body = await request.json()
    } catch {
      return json({ error: 'bad json' }, 400, origin)
    }

    const question = (body.question ?? '').trim().slice(0, 600)
    if (!question) return json({ error: 'empty question' }, 400, origin)

    // --- авторизация ---
    if (env.DEV_MODE !== '1') {
      const userId = await validateInitData(body.initData ?? '', env.BOT_TOKEN)
      const allowed = env.ALLOWED_USERS.split(',').map(s => Number(s.trim()))
      if (userId === null || !allowed.includes(userId)) {
        return json({ error: 'Доступ только из Telegram (приватная бета).' }, 403, origin)
      }
    }

    // --- собираем диалог: короткая история + контекст текущего шага ---
    const history = (body.history ?? [])
      .slice(-8)
      .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }))
    const context = (body.context ?? '').slice(0, 300)
    const userTurn = context ? `[Ученик сейчас на шаге: ${context}]\n\n${question}` : question

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM,
        messages: [...history, { role: 'user', content: userTurn }],
      })
      const answer = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('')
      return json({ answer }, 200, origin)
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError || err instanceof Anthropic.InternalServerError) {
        return json({ error: 'Тьютор перегружен, попробуй через минуту.' }, 503, origin)
      }
      if (err instanceof Anthropic.APIError) {
        return json({ error: `Ошибка API (${err.status})` }, 502, origin)
      }
      return json({ error: 'Неизвестная ошибка' }, 500, origin)
    }
  },
}
