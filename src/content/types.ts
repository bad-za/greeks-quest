import type { ReactNode } from 'react'
import type { OptType } from '../lib/bs'

export interface QuizQuestion {
  question: string
  options: string[]
  correct: number
  explain: string
}

export interface MissionLeg {
  type: OptType
  side: 1 | -1
  strike: number
  qty: number
  /** если не задано — берётся dte миссии */
  dte?: number
}

export type Verdict = 'best' | 'ok' | 'bad'

export interface MissionChoice {
  label: string
  desc: string
  legs: MissionLeg[]
  /** покупка спота, в BTC */
  spotQty?: number
  verdict: Verdict
  debrief: string
}

export interface Mission {
  id: string
  title: string
  brief: ReactNode
  /** цена BTC на входе */
  spot: number
  /** IV на входе, % */
  iv: number
  /** IV в конце сценария, % (для уроков про IV crush); по умолчанию = iv */
  ivEnd?: number
  /** дней до экспирации опционов на входе */
  dte: number
  /** сколько дней проигрывается сценарий */
  days: number
  path:
    | { seed: number; vol: number; drift: number; shockDay?: number; shockPct?: number }
    | { fixed: number[] }
  choices: MissionChoice[]
  /** общий разбор после результата */
  debrief: ReactNode
}

export type Step =
  | { kind: 'theory'; title: string; body: ReactNode }
  | { kind: 'widget'; title: string; body?: ReactNode; widget: ReactNode; task?: string }
  | { kind: 'quiz'; title: string; questions: QuizQuestion[] }
  | { kind: 'mission'; mission: Mission }

export interface Level {
  id: string
  act: number
  emoji: string
  title: string
  subtitle: string
  steps: Step[]
}

export interface Achievement {
  id: string
  emoji: string
  title: string
  desc: string
}
