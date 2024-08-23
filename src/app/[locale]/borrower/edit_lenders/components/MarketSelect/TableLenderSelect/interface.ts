import { Dispatch, SetStateAction } from "react"

import { MarketDataT } from "@/app/[locale]/borrower/edit_lenders/lendersMock"

import {
  LenderTableT,
  MarketTableT as OriginalMarketTableT,
} from "../../../interface"

export type TableLenderSelectProps = {
  borrowerMarkets: MarketDataT[]
  lenderMarkets: OriginalMarketTableT[]
  lenderAddress: string
  setLendersRows: Dispatch<SetStateAction<LenderTableT[]>>
  disabled: boolean
}

export type MarketTableT = OriginalMarketTableT & {
  prevStatus?: "new" | "old" | "deleted"
}
