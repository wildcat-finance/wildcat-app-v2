import { BorrowerRestrictionState } from "@/utils/borrowerRestrictionState"

export type LastKnownRestrictionsType = {
  [addressChainKey: string]: BorrowerRestrictionState
}

export interface SetLastKnownRestrictionPayload {
  address: string
  chainId: number
  state: BorrowerRestrictionState
}
