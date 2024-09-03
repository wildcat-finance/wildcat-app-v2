import { Dispatch, SetStateAction } from "react"

import { MarketTableT } from "@/app/[locale]/borrower/edit_lenders/interface"
import { MarketDataT } from "@/app/[locale]/borrower/edit_lenders/lendersMock"

export type AddLenderSelectProps = {
  borrowerMarkets: MarketDataT[]
  selectedMarkets: MarketTableT[]
  setSelectedMarkets: Dispatch<SetStateAction<MarketTableT[]>>
  disabled?: boolean
}
