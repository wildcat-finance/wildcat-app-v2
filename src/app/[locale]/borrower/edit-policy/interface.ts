import { LenderRole, PolicyMarketsAndLenders } from "@wildcatfi/wildcat-sdk"

import {
  EditLenderFlowStatuses,
  MarketTableDataType,
} from "../edit-lenders-list/interface"

export type PolicyLenderMarketTableDataType = {
  address: string
  name: string
  role?: LenderRole
  isKnownLender?: boolean
}

export type PolicyLenderTableDataType = {
  id: string
  address: string
  credentialExpiry: number | undefined
  credentialSource: string
  activeMarkets: PolicyLenderMarketTableDataType[]
  status: EditLenderFlowStatuses
}

export type LenderInfo = PolicyMarketsAndLenders["lenders"][number] & {
  credentialExpiry: number | undefined
  credentialSource: string
}

export type { MarketTableDataType }

export { EditLenderFlowStatuses }
