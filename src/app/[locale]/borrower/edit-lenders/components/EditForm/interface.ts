import { Dispatch, SetStateAction } from "react"

import { LenderTableT } from "@/app/[locale]/borrower/edit-lenders/interface"
import { MarketDataT } from "@/app/[locale]/borrower/edit-lenders/lendersMock"

export type EditLendersFormProps = {
  lendersRows: LenderTableT[]
  setLendersRows: Dispatch<SetStateAction<LenderTableT[]>>
  borrowerMarkets: MarketDataT[]
}
