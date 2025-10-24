export type THighLightSidebar = {
  checked: number
  sidebarState: {
    borrowRepay: boolean
    statusDetails: boolean
    marketSummary: boolean
    withdrawals: boolean
    lenders: boolean
    mla: boolean
    marketHistory: boolean
  }
  withdrawalsAmount: number
}
