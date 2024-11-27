import {
  EditLenderFlowStatuses,
  MarketTableDataType,
} from "@/app/[locale]/borrower/edit-lenders-list/interface"

export type TableSelectProps = {
  lenderAddress: `0x${string}`
  lenderMarkets: MarketTableDataType[]
  lenderStatus: EditLenderFlowStatuses
}
