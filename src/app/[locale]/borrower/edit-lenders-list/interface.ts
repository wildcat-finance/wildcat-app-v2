export enum EditLenderFlowStatuses {
  OLD = "old",
  NEW = "new",
  DELETED = "deleted",
}

export type MarketTableDataType = {
  name: string
  address: string
  status: EditLenderFlowStatuses
}

export type LenderTableDataType = {
  id: string
  address: string
  markets: MarketTableDataType[]
  status: EditLenderFlowStatuses
}
