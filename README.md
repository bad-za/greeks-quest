# Greeks Quest — интерактивный курс по крипто-опционам

Обучающая игра: 12 уровней от «что такое колл» до волатильностных стратегий и
исторических сценариев (крах FTX, одобрение ETF, халвинг). Под капотом — честный
Блэк-Шоулз: все премии, греки и P&L считаются, а не нарисованы.

**Прод**: https://bad-za.github.io/greeks-quest/ (открывается через Telegram-бота
[@GreeksQuest_bot](https://t.me/GreeksQuest_bot), см. «Доступ» ниже).

## Запуск локально

```bash
npm install
npm run dev
```

Открой http://localhost:5173 — на localhost ограничение доступа не действует.

## Структура курса

- Акт I — основы: коллы, путы, инверсные опционы Deribit
- Акт II — греки: дельта, гамма, тета, вега, IV
- Акт III — стратегии: спреды, covered call, стрэддлы, кондоры
- Акт IV — улыбка/скью, риск-менеджмент, финальный экзамен

Прогресс, XP, виртуальный портфель $10,000 и ачивки хранятся в localStorage,
а внутри Telegram дополнительно синхронизируются через CloudStorage между
устройствами. Сбросить — кнопка внизу карты курса.

## Структура кода

- `src/lib/bs.ts` — Блэк-Шоулз: цены, греки, P&L позиций из ног
- `src/lib/rng.ts` — seeded GBM-генератор ценовых путей (миссии воспроизводимы)
- `src/lib/telegram.ts` — обёртка Telegram WebApp SDK (кнопка «Назад», хаптика, CloudStorage)
- `src/content/act*.tsx` — весь учебный контент по актам; `levels.ts` — реестр
- `src/components/widgets/` — интерактивные песочницы (payoff, греки, IV, улыбка)
- `src/components/Mission.tsx` — движок миссий: выбор → анимация пути → вердикт
- `src/state/store.tsx` — XP/баланс/прогресс + персист в localStorage и CloudStorage

## Деплой

GitHub Actions (`.github/workflows/deploy.yml`): каждый пуш в `main`
собирает проект и публикует на GitHub Pages. Ничего делать не нужно —
запушил и через минуту прод обновился.

## Доступ (приватная бета)

Приложение закрыто allowlist'ом по Telegram user ID — список в
`ALLOWED_USERS` (`src/App.tsx`). Остальные видят экран «Приватная бета».
Прямое открытие прод-URL в браузере тоже заблокировано; localhost — открыт.

Проверка клиентская (по `initDataUnsafe`): от случайных посетителей защищает,
но криптографической гарантии не даёт. Для публичного запуска с реальным
контролем доступа нужна серверная валидация подписи `initData` токеном бота.

## AI-тьютор (Cloudflare Worker)

`worker/` — единственное место, где живёт ключ Anthropic API. Авторизация —
криптографическая проверка подписи Telegram `initData` токеном бота.
Ответы стримятся; модель задаётся переменной `MODEL` в `worker/wrangler.toml`.
Дневной лимит вопросов (40/день на пользователя) включается биндингом KV —
команды в комментарии `wrangler.toml`; без биндинга лимита нет.

Деплой воркера ручной: `cd worker && npx wrangler deploy`.

## Telegram-бот

Бот: [@GreeksQuest_bot](https://t.me/GreeksQuest_bot). Кнопка «🎮 Играть»
(Menu Button), имя и описания настроены через Bot API. Токен лежит в
`bot_token.env` — файл в `.gitignore`, в репозиторий не попадает.

Бэкенд бота — тот же воркер: роут `/webhook` отвечает на `/start` (и любой
другой текст) приветствием с кнопкой, открывающей Mini App. Включение после
деплоя воркера (секрет — любая случайная строка, одна и та же в обеих командах):

```bash
TOKEN=$(grep -o '[0-9]\{8,\}:[A-Za-z0-9_-]\{30,\}' bot_token.env)
cd worker && npx wrangler secret put WEBHOOK_SECRET && cd ..
curl -s "https://api.telegram.org/bot$TOKEN/setWebhook" \
  -d 'url=https://greeks-quest-tutor.bigbadnoob.workers.dev/webhook' \
  -d 'secret_token=<та же строка>' \
  -d 'allowed_updates=["message"]' -d 'drop_pending_updates=true'
```

Ассеты: `avatar-512.png` (аватар бота, загружается вручную через
BotFather → `/setuserpic`), `banner-640x360.png` (фото для `/newapp`).

Пересоздать кнопку/описания после смены токена:

```bash
TOKEN=$(grep -o '[0-9]\{8,\}:[A-Za-z0-9_-]\{30,\}' bot_token.env)
curl -s -X POST "https://api.telegram.org/bot$TOKEN/setChatMenuButton" \
  -H "Content-Type: application/json" \
  -d '{"menu_button":{"type":"web_app","text":"🎮 Играть","web_app":{"url":"https://bad-za.github.io/greeks-quest/"}}}'
```

Учебный материал, не финансовый совет.
