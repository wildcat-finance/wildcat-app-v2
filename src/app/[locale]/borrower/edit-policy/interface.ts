import { LenderRole } from "@wildcatfi/wildcat-sdk"

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

export type { MarketTableDataType }

export { EditLenderFlowStatuses }
