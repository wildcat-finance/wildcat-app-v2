export type DestinationRoute = "BORROW_AGAINST"

export type DestinationPlatform = "morpho-blue"

export type DestinationNotice = "THIN_LIQUIDITY"

export type DestinationAffiliation =
  | { kind: "affiliated"; basis: "address" | "name"; entityName: string }
  | { kind: "not_reviewed" }

export type DestinationFigures = {
  lltv: number
  borrowApy: number | null
  borrowApyWindow: "6h"
  availableLiquidity: number
  availableLiquidityUsd: number | null
  asOf: number
}

export type Destination = {
  id: string
  route: DestinationRoute
  platform: DestinationPlatform
  platformName: string
  venueId: string
  venueName: string
  token: { address: string; symbol: string; form: "wrapper" }
  loanAsset: { address: string; symbol: string }
  url: string
  urlHost: string
  curators: string[]
  affiliation: DestinationAffiliation
  figures: DestinationFigures
  notices: DestinationNotice[]
}

export type DestinationsResponse = {
  chainId: number
  generatedAt: number
  stale: boolean
  markets: Record<string, Destination[]>
}
