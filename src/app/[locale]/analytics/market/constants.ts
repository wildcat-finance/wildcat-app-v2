export const DEFAULT_MARKET = "0xc9499006a149c553d18171747ed19aa7c6dd19e2"

export function truncTx(h: string): string {
  return `${h.slice(0, 6)}...${h.slice(-4)}`
}
