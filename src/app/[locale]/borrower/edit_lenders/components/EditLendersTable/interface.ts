import { Dispatch, SetStateAction } from "react"

import { LenderTableT } from "@/app/[locale]/borrower/edit_lenders/interface"
import { MarketDataT } from "@/app/[locale]/borrower/edit_lenders/lendersMock"

export type EditLendersTableProps = {
  lendersRows: LenderTableT[]
  setLendersRows: Dispatch<SetStateAction<LenderTableT[]>>
  setLendersNames: Dispatch<SetStateAction<{ [p: string]: string }>>
  borrowerMarkets: MarketDataT[]
}
