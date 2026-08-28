import { HooksInstance, MarketController } from "@wildcatfi/wildcat-sdk"

import type { PolicyLenderAccessSource } from "@/utils/policyLenderAccess"

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
  accessSources: PolicyLenderAccessSource[]
}

export type LendersTabProps = {
  policyName?: string
  isLoading: boolean
  policy?: HooksInstance
  controller?: MarketController
}
