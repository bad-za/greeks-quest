import type { Level } from './types'
import { ACT1 } from './act1'
import { ACT2 } from './act2'
import { ACT3 } from './act3'
import { ACT4 } from './act4'

export const LEVELS: Level[] = [...ACT1, ...ACT2, ...ACT3, ...ACT4]

export const ACTS = [
  { num: 1, title: 'Основы: право, а не обязанность' },
  { num: 2, title: 'Греки: приборная панель' },
  { num: 3, title: 'Стратегии: конструктор позиций' },
  { num: 4, title: 'Мастерство: волатильность и выживание' },
]
