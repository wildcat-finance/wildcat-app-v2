import { MarketController } from "@wildcatfi/wildcat-sdk"
import { HooksInstance } from "@wildcatfi/wildcat-sdk/dist/access"

export enum EditLenderFlowStatuses {
  OLD = "old",
  NEW = "new",
  DELETED = "deleted",
}

export type LendersItem = {
  id: string
  address: string
  status: EditLenderFlowStatuses
  isAuthorized: boolean
}

export type LendersTabProps = {
  policyName?: string
  isLoading: boolean
  policy?: HooksInstance
  controller?: MarketController
}
