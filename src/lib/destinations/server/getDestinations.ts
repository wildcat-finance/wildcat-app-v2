import { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import type { Hex } from "viem"

import { loadBorrowerIdentities } from "./affiliation"
import { getMorphoMarketParams, getWrappedMarkets } from "./chain"
import { evaluateMorphoMarket, fetchMorphoMarkets } from "./morpho"
import {
  CACHE_TTL_MS,
  FAILURE_BACKOFF_MS,
  supportsDestinations,
} from "../constants"
import { pruneExpired } from "../freshness"
import type { Destination, DestinationsResponse } from "../types"

const nowSec = () => Math.floor(Date.now() / 1000)

const emptyResponse = (chainId: number): DestinationsResponse => ({
  chainId,
  stale: false,
  markets: {},
})

const buildDestinations = async (
  chainId: SupportedChainId,
): Promise<DestinationsResponse> => {
  const wrapped = await getWrappedMarkets(chainId)
  if (wrapped.length === 0) return emptyResponse(chainId)

  const byWrapper = new Map(
    wrapped.map((entry) => [entry.wrapper.toLowerCase(), entry]),
  )
  const morphoMarkets = await fetchMorphoMarkets(
    chainId,
    wrapped.map((entry) => entry.wrapper),
  )
  if (morphoMarkets.length === 0) return emptyResponse(chainId)

  const [onchainParams, borrowers] = await Promise.all([
    getMorphoMarketParams(
      chainId,
      morphoMarkets.map((market) => market.marketId as Hex),
    ),
    loadBorrowerIdentities(
      chainId,
      wrapped.map((entry) => entry.borrower),
    ),
  ])

  const now = nowSec()
  const markets: Record<string, Destination[]> = {}

  morphoMarkets.forEach((morphoMarket) => {
    const entry = byWrapper.get(
      morphoMarket.collateralAsset.address.toLowerCase(),
    )
    if (!entry) return

    const destination = evaluateMorphoMarket({
      chainId,
      market: morphoMarket,
      wrapper: entry.wrapper,
      asset: entry.asset,
      onchain: onchainParams.get(morphoMarket.marketId.toLowerCase()),
      borrower: borrowers.get(entry.borrower.toLowerCase()),
      nowSec: now,
    })
    if (!destination) return

    const key = entry.market.toLowerCase()
    markets[key] = [...(markets[key] ?? []), destination]
  })

  Object.values(markets).forEach((destinations) =>
    destinations.sort(
      (a, b) =>
        b.figures.availableLiquidityUsd - a.figures.availableLiquidityUsd,
    ),
  )

  return { chainId, stale: false, markets }
}

const withoutExpired = (
  payload: DestinationsResponse,
): DestinationsResponse => ({
  ...payload,
  stale: true,
  markets: pruneExpired(payload.markets, nowSec()),
})

type CacheEntry = { payload: DestinationsResponse; storedAt: number }

const cache = new Map<number, CacheEntry>()
const inFlight = new Map<number, Promise<DestinationsResponse>>()
const lastFailure = new Map<number, number>()

export const getDestinations = async (
  chainId: SupportedChainId,
): Promise<DestinationsResponse> => {
  if (!supportsDestinations(chainId)) return emptyResponse(chainId)

  const cached = cache.get(chainId)
  if (cached && Date.now() - cached.storedAt < CACHE_TTL_MS) {
    return cached.payload
  }

  const failedAt = lastFailure.get(chainId)
  if (failedAt && Date.now() - failedAt < FAILURE_BACKOFF_MS) {
    if (cached) return withoutExpired(cached.payload)
    throw new Error("Destinations refresh failed recently")
  }

  let pending = inFlight.get(chainId)
  if (!pending) {
    pending = buildDestinations(chainId).finally(() => inFlight.delete(chainId))
    inFlight.set(chainId, pending)
  }

  try {
    const payload = await pending
    cache.set(chainId, { payload, storedAt: Date.now() })
    lastFailure.delete(chainId)
    return payload
  } catch (error) {
    lastFailure.set(chainId, Date.now())
    if (cached) return withoutExpired(cached.payload)
    throw error
  }
}
