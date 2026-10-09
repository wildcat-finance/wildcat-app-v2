import type { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import type {
  Destination,
  DestinationPlatform,
  DestinationTokenForm,
} from "../../types"
import type { Counterparty } from "../affiliation"
import type { WildcatToken } from "../universe"

/** What an adapter fills in. The orchestrator adds identity, labels, urlHost and affiliation. */
export type DestinationDraft = Omit<
  Destination,
  "id" | "platform" | "platformName" | "urlHost" | "affiliation"
>

export type AdapterOutput = {
  /** Stable id of the venue on its platform, e.g. the Morpho market id */
  venueKey: string
  destination: DestinationDraft
  /** Parties whose control of the venue can make it affiliated with the borrower */
  counterparties: Counterparty[]
}

export type AdapterContext = {
  chainId: SupportedChainId
  tokens: readonly WildcatToken[]
}

export type DestinationAdapter = {
  platform: DestinationPlatform
  /** Token forms the platform takes; venues in any other form are dropped */
  accepts: readonly DestinationTokenForm[]
  /**
   * Discovers, proves on-chain and evaluates venues for the given tokens.
   * Throws on upstream failure instead of returning [], so the orchestrator
   * can fall back to the last good result.
   */
  load: (context: AdapterContext) => Promise<AdapterOutput[]>
}
