export type DestinationRoute = "BORROW_AGAINST"

export type DestinationPlatform = "morpho-blue"

export type DestinationNotice = "THIN_LIQUIDITY"

export type DestinationAffiliation =
  | { kind: "affiliated"; entityName: string }
  | { kind: "not_reviewed" }

export type DestinationFigures = {
  lltv: number
  borrowApy: number | null
  availableLiquidity: number
  availableLiquidityUsd: number
  asOf: number
}

export type Destination = {
  id: string
  route: DestinationRoute
  platform: DestinationPlatform
  platformName: string
  venueName: string
  title: string
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
  stale: boolean
  markets: Record<string, Destination[]>
}
