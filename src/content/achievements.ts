import type { Achievement } from './types'

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-steps', emoji: '👶', title: 'Первые шаги', desc: 'Пройден первый уровень' },
  { id: 'first-trade', emoji: '🤝', title: 'Первая сделка', desc: 'Выполнена первая миссия' },
  { id: 'profit', emoji: '💰', title: 'В плюсе', desc: 'Закрыта миссия с прибылью' },
  { id: 'best-trade', emoji: '🎯', title: 'Снайпер', desc: 'Выбрано лучшее решение в миссии' },
  {
    id: 'rekt',
    emoji: '💀',
    title: 'REKT',
    desc: 'Депозит обнулился. Бывает с каждым — теперь ты знаешь цену риска',
  },
  { id: 'greeks', emoji: '🏛️', title: 'Знаток греков', desc: 'Пройден акт II — все греки изучены' },
  { id: 'strategist', emoji: '♟️', title: 'Стратег', desc: 'Пройден акт III — стратегии освоены' },
  { id: 'vol-whisperer', emoji: '🌪️', title: 'Заклинатель волатильности', desc: 'Пройден акт IV' },
  { id: 'survivor', emoji: '🏆', title: 'Выживший', desc: 'Пройден финальный экзамен' },
  { id: 'whale', emoji: '🐋', title: 'Кит', desc: 'Баланс портфеля превысил $15,000' },
  { id: 'quiz-ace', emoji: '🧠', title: 'Отличник', desc: 'Квиз пройден без единой ошибки' },
]
