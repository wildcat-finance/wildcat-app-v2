import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import { ADAPTERS } from "./adapters"
import type { AdapterOutput, DestinationAdapter } from "./adapters/types"
import {
  type BorrowerIdentity,
  loadBorrowerIdentities,
  resolveAffiliation,
} from "./affiliation"
import { ROUTE_RULES, type RouteRejection } from "./routes"
import { getWildcatTokens, tokenAddressOf, type WildcatToken } from "./universe"
import { CACHE_TTL_MS, FAILURE_BACKOFF_MS } from "../constants"
import { isFresh, pruneExpired } from "../freshness"
import { PLATFORMS, supportsDestinations } from "../platforms"
import type {
  Destination,
  DestinationPlatform,
  DestinationsResponse,
} from "../types"

type DropReason =
  | RouteRejection
  | "token_form"
  | "unknown_token"
  | "expired"
  | "bad_url"

// Route rejections and expiry are policy and stay quiet. These point at an
// adapter bug or an upstream that changed, so they are logged.
const UNEXPECTED_DROPS: ReadonlySet<DropReason> = new Set([
  "token_form",
  "unknown_token",
  "bad_url",
])

const nowSec = () => Math.floor(Date.now() / 1000)

const emptyResponse = (chainId: number): DestinationsResponse => ({
  chainId,
  stale: false,
  stalePlatforms: [],
  markets: {},
})

const sameAddress = (a: string, b: string) =>
  a.toLowerCase() === b.toLowerCase()

const httpsHost = (url: string) => {
  try {
    const parsed = new URL(url)
    return parsed.protocol === "https:" ? parsed.host : null
  } catch {
    return null
  }
}

const adaptersFor = (chainId: number) =>
  ADAPTERS.filter((adapter) =>
    PLATFORMS[adapter.platform].chainIds.includes(chainId),
  )

type AdapterRun = {
  adapter: DestinationAdapter
  /** null when the adapter failed and has no earlier result to fall back to */
  outputs: AdapterOutput[] | null
  failed: boolean
}

const lastGood = new Map<string, AdapterOutput[]>()

const runAdapter = async (
  adapter: DestinationAdapter,
  chainId: SupportedChainId,
  tokens: WildcatToken[],
): Promise<AdapterRun> => {
  const key = `${chainId}:${adapter.platform}`
  try {
    const outputs = await adapter.load({ chainId, tokens })
    lastGood.set(key, outputs)
    return { adapter, outputs, failed: false }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      `[Destinations] ${adapter.platform} refresh failed on chain ${chainId}`,
      error,
    )
    return { adapter, outputs: lastGood.get(key) ?? null, failed: true }
  }
}

const place = ({
  chainId,
  adapter,
  output: { venueKey, destination: draft, counterparties },
  tokens,
  borrowers,
  now,
}: {
  chainId: SupportedChainId
  adapter: DestinationAdapter
  output: AdapterOutput
  tokens: WildcatToken[]
  borrowers: Map<string, BorrowerIdentity>
  now: number
}): { market: string; destination: Destination } | { drop: DropReason } => {
  if (!adapter.accepts.includes(draft.token.form)) return { drop: "token_form" }

  const token = tokens.find((candidate) =>
    sameAddress(
      tokenAddressOf[draft.token.form](candidate),
      draft.token.address,
    ),
  )
  if (!token) return { drop: "unknown_token" }
  if (!isFresh(draft.figures.asOf, now)) return { drop: "expired" }

  const urlHost = httpsHost(draft.url)
  if (!urlHost) return { drop: "bad_url" }

  const rule = ROUTE_RULES[draft.route]
  const rejection = rule.reject(draft, token)
  if (rejection) return { drop: rejection }

  const { platform } = adapter
  return {
    market: token.market.toLowerCase(),
    destination: {
      id: `${platform}:${chainId}:${venueKey.toLowerCase()}`,
      platform,
      platformName: PLATFORMS[platform].name,
      ...draft,
      urlHost,
      affiliation: resolveAffiliation({
        borrower: borrowers.get(token.borrower.toLowerCase()),
        counterparties,
      }),
      notices: [...draft.notices, ...rule.notices(draft)],
    },
  }
}

const buildDestinations = async (
  chainId: SupportedChainId,
): Promise<DestinationsResponse> => {
  const adapters = adaptersFor(chainId)
  if (adapters.length === 0) return emptyResponse(chainId)

  const tokens = await getWildcatTokens(chainId)
  if (tokens.length === 0) return emptyResponse(chainId)

  const [runs, borrowers] = await Promise.all([
    Promise.all(
      adapters.map((adapter) => runAdapter(adapter, chainId, tokens)),
    ),
    loadBorrowerIdentities(
      chainId,
      tokens.map((token) => token.borrower),
    ),
  ])
  if (runs.every((run) => run.outputs === null)) {
    throw new Error(`Every destination platform failed on chain ${chainId}`)
  }

  const now = nowSec()
  const markets: Record<string, Destination[]> = {}
  const stalePlatforms: DestinationPlatform[] = []

  runs.forEach(({ adapter, outputs, failed }) => {
    if (failed) stalePlatforms.push(adapter.platform)

    const unexpected: Partial<Record<DropReason, number>> = {}
    outputs?.forEach((output) => {
      const placed = place({ chainId, adapter, output, tokens, borrowers, now })
      if ("drop" in placed) {
        if (UNEXPECTED_DROPS.has(placed.drop)) {
          unexpected[placed.drop] = (unexpected[placed.drop] ?? 0) + 1
        }
        return
      }
      markets[placed.market] = [
        ...(markets[placed.market] ?? []),
        placed.destination,
      ]
    })

    if (Object.keys(unexpected).length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `[Destinations] ${adapter.platform} venues dropped on chain ${chainId}`,
        unexpected,
      )
    }
  })

  Object.values(markets).forEach((destinations) =>
    destinations.sort(
      (a, b) => ROUTE_RULES[b.route].rank(b) - ROUTE_RULES[a.route].rank(a),
    ),
  )

  return { chainId, stale: false, stalePlatforms, markets }
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

// A payload with stale platforms is retried sooner, so a platform that comes
// back is picked up within the failure backoff rather than the full TTL.
const ttlOf = ({ stalePlatforms }: DestinationsResponse) =>
  stalePlatforms.length > 0 ? FAILURE_BACKOFF_MS : CACHE_TTL_MS

export const getDestinations = async (
  chainId: SupportedChainId,
): Promise<DestinationsResponse> => {
  if (!supportsDestinations(chainId)) return emptyResponse(chainId)

  const cached = cache.get(chainId)
  if (cached && Date.now() - cached.storedAt < ttlOf(cached.payload)) {
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
    if (!cached) throw error
    // eslint-disable-next-line no-console
    console.error(
      `[Destinations] refresh failed on chain ${chainId}, serving the last response`,
      error,
    )
    return withoutExpired(cached.payload)
  }
}
