// Seeded PRNG (mulberry32) и генератор ценовых путей — чтобы миссии были воспроизводимыми

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Нормальная случайная величина (Box–Muller) */
export function gauss(rand: () => number): number {
  const u1 = Math.max(rand(), 1e-12)
  const u2 = rand()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

export interface PathSpec {
  seed: number
  spot: number
  days: number
  /** годовая волатильность, в долях */
  vol: number
  /** годовой дрейф, в долях (например 0.5 = +50% годовых) */
  drift: number
  /** шок: на этом дне цена дополнительно умножается на (1+shockPct) */
  shockDay?: number
  shockPct?: number
}

/** Геометрическое броуновское движение по дням, возвращает массив длиной days+1 */
export function gbmPath(spec: PathSpec): number[] {
  const rand = mulberry32(spec.seed)
  const dt = 1 / 365
  const path = [spec.spot]
  let s = spec.spot
  for (let d = 1; d <= spec.days; d++) {
    const z = gauss(rand)
    s = s * Math.exp((spec.drift - 0.5 * spec.vol * spec.vol) * dt + spec.vol * Math.sqrt(dt) * z)
    if (spec.shockDay === d && spec.shockPct) s = s * (1 + spec.shockPct)
    path.push(s)
  }
  return path
}
