import { MAX_DATA_AGE_SEC } from "./constants"
import type { Destination } from "./types"

export const isFresh = (asOfSec: number, nowSec: number) =>
  nowSec - asOfSec <= MAX_DATA_AGE_SEC

export const pruneExpired = (
  markets: Record<string, Destination[]>,
  nowSec: number,
): Record<string, Destination[]> => {
  const fresh: Record<string, Destination[]> = {}
  Object.entries(markets).forEach(([market, destinations]) => {
    const current = destinations.filter((destination) =>
      isFresh(destination.figures.asOf, nowSec),
    )
    if (current.length > 0) fresh[market] = current
  })
  return fresh
}
