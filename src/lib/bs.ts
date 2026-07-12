// Black-Scholes pricing and greeks (r = 0 — для крипто-опционов это стандартное допущение)

export type OptType = 'call' | 'put'

const SQRT_2PI = Math.sqrt(2 * Math.PI)

export function pdf(x: number): number {
  return Math.exp(-0.5 * x * x) / SQRT_2PI
}

// Abramowitz–Stegun approximation of the standard normal CDF
export function cdf(x: number): number {
  if (x < -8) return 0
  if (x > 8) return 1
  const k = 1 / (1 + 0.2316419 * Math.abs(x))
  const poly =
    k * (0.31938153 + k * (-0.356563782 + k * (1.781477937 + k * (-1.821255978 + k * 1.330274429))))
  const approx = 1 - pdf(Math.abs(x)) * poly
  return x >= 0 ? approx : 1 - approx
}

export interface Greeks {
  price: number
  delta: number
  gamma: number
  /** изменение цены за 1 календарный день */
  thetaDay: number
  /** изменение цены при сдвиге IV на 1 процентный пункт */
  vega1pct: number
}

/**
 * @param S    spot
 * @param K    strike
 * @param iv   implied volatility, в долях (0.65 = 65%)
 * @param tYears время до экспирации в годах
 */
export function bs(type: OptType, S: number, K: number, iv: number, tYears: number): Greeks {
  if (tYears <= 0 || iv <= 0) {
    const intrinsic = type === 'call' ? Math.max(S - K, 0) : Math.max(K - S, 0)
    const delta = type === 'call' ? (S > K ? 1 : 0) : S < K ? -1 : 0
    return { price: intrinsic, delta, gamma: 0, thetaDay: 0, vega1pct: 0 }
  }
  const sqrtT = Math.sqrt(tYears)
  const d1 = (Math.log(S / K) + 0.5 * iv * iv * tYears) / (iv * sqrtT)
  const d2 = d1 - iv * sqrtT
  const price = type === 'call' ? S * cdf(d1) - K * cdf(d2) : K * cdf(-d2) - S * cdf(-d1)
  const delta = type === 'call' ? cdf(d1) : cdf(d1) - 1
  const gamma = pdf(d1) / (S * iv * sqrtT)
  const thetaYear = -(S * pdf(d1) * iv) / (2 * sqrtT)
  const vega = S * pdf(d1) * sqrtT // per 1.0 of vol
  return {
    price,
    delta,
    gamma,
    thetaDay: thetaYear / 365,
    vega1pct: vega / 100,
  }
}

export function daysToYears(days: number): number {
  return days / 365
}

/** Выплата опциона на экспирации (USD на 1 контракт = 1 BTC) */
export function payoffAtExpiry(type: OptType, S: number, K: number): number {
  return type === 'call' ? Math.max(S - K, 0) : Math.max(K - S, 0)
}

export interface Leg {
  type: OptType
  /** 1 = long, -1 = short */
  side: 1 | -1
  strike: number
  qty: number
  /** премия за контракт в USD, зафиксированная при входе */
  premium: number
  /** дней до экспирации на момент входа */
  dte: number
}

export function legValue(leg: Leg, S: number, iv: number, daysLeft: number): number {
  return bs(leg.type, S, leg.strike, iv, daysToYears(Math.max(daysLeft, 0))).price
}

/** P&L позиции из ног при споте S, оставшихся днях и текущей IV */
export function legsPnl(legs: Leg[], S: number, iv: number, daysLeft: number): number {
  let pnl = 0
  for (const leg of legs) {
    const value =
      daysLeft <= 0 ? payoffAtExpiry(leg.type, S, leg.strike) : legValue(leg, S, iv, daysLeft)
    pnl += leg.side * leg.qty * (value - leg.premium)
  }
  return pnl
}

/** Суммарные греки позиции */
export function legsGreeks(legs: Leg[], S: number, iv: number, daysLeft: number): Greeks {
  const total: Greeks = { price: 0, delta: 0, gamma: 0, thetaDay: 0, vega1pct: 0 }
  for (const leg of legs) {
    const g = bs(leg.type, S, leg.strike, iv, daysToYears(Math.max(daysLeft, 0.0001)))
    const m = leg.side * leg.qty
    total.price += m * g.price
    total.delta += m * g.delta
    total.gamma += m * g.gamma
    total.thetaDay += m * g.thetaDay
    total.vega1pct += m * g.vega1pct
  }
  return total
}
