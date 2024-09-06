import { Dispatch, SetStateAction } from "react"

import { LenderTableT } from "@/app/[locale]/borrower/edit_lenders/interface"
import { MarketDataT } from "@/app/[locale]/borrower/edit_lenders/lendersMock"

export type AddLenderModalProps = {
  setLendersRows: Dispatch<SetStateAction<LenderTableT[]>>
  borrowerMarkets: MarketDataT[]
  existingLenders: string[]
}
