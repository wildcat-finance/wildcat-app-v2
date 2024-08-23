import { Dispatch, SetStateAction } from "react"

import { LenderTableT as OriginalLenderTableT } from "@/app/[locale]/borrower/edit_lenders/interface"
import { MarketDataT } from "@/app/[locale]/borrower/edit_lenders/lendersMock"

export type LenderTableT = OriginalLenderTableT & {
  prevStatus?: "new" | "old" | "deleted"
}

export type EditLendersTableProps = {
  lendersRows: LenderTableT[]
  setLendersRows: Dispatch<SetStateAction<LenderTableT[]>>
  setLendersNames: Dispatch<SetStateAction<{ [p: string]: string }>>
  borrowerMarkets: MarketDataT[]
}
