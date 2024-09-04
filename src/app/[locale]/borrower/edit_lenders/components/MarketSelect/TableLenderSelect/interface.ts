import { Dispatch, SetStateAction } from "react"

import { MarketDataT } from "@/app/[locale]/borrower/edit_lenders/lendersMock"

import { LenderTableT, MarketTableT } from "../../../interface"

export type TableLenderSelectProps = {
  borrowerMarkets: MarketDataT[]
  lenderMarkets: MarketTableT[]
  lenderAddress: string
  setLendersRows: Dispatch<SetStateAction<LenderTableT[]>>
  disabled: boolean
}
