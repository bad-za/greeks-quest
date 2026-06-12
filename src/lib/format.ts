export function usd(x: number, digits = 0): string {
  const sign = x < 0 ? '−' : ''
  return `${sign}$${Math.abs(x).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`
}

export function usdSigned(x: number, digits = 0): string {
  return (x > 0 ? '+' : '') + usd(x, digits)
}

export function pct(x: number, digits = 0): string {
  return `${x.toFixed(digits)}%`
}

export function btc(x: number, digits = 4): string {
  return `₿${x.toFixed(digits)}`
}

export function num(x: number, digits = 2): string {
  return x.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}
