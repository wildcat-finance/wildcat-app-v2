export const RAY = BigInt("1000000000000000000000000000")

export function normalizeScaled(scaled: string, scaleFactor: string): bigint {
  return (BigInt(scaled) * BigInt(scaleFactor)) / RAY
}

export function toHuman(raw: string | bigint, decimals: number): number {
  return Number(typeof raw === "string" ? BigInt(raw) : raw) / 10 ** decimals
}

export function fmtUSD(v: number): string {
  if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(2)}B`
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(2)}M`
  if (Math.abs(v) >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
  return `$${v.toFixed(0)}`
}
