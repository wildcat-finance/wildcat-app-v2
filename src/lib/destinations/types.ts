export type DestinationRoute = "BORROW_AGAINST"

export type DestinationPlatform = "morpho-blue"

export type DestinationTokenForm = "wrapper"

export type DestinationNotice = "THIN_LIQUIDITY"

export type DestinationAffiliation =
  | { kind: "affiliated"; entityName: string }
  | { kind: "not_reviewed" }

export type DestinationFigures = {
  lltv: number
  borrowApy: number | null
  availableLiquidityUsd: number
  asOf: number
}

export type Destination = {
  id: string
  route: DestinationRoute
  platform: DestinationPlatform
  platformName: string
  title: string
  token: { address: string; symbol: string; form: DestinationTokenForm }
  loanAsset: { address: string }
  url: string
  urlHost: string
  curators: string[]
  affiliation: DestinationAffiliation
  figures: DestinationFigures
  notices: DestinationNotice[]
}

export type DestinationsResponse = {
  chainId: number
  /** Every row is last-known data: the whole refresh failed */
  stale: boolean
  /** Platforms that failed this refresh; their rows, if any, are last-known data */
  stalePlatforms: DestinationPlatform[]
  markets: Record<string, Destination[]>
}
