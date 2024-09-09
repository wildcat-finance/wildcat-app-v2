import { Dispatch, SetStateAction } from "react"

import { MarketTableT } from "@/app/[locale]/borrower/edit-lenders/interface"
import { MarketDataT } from "@/app/[locale]/borrower/edit-lenders/lendersMock"

export type AddLenderSelectProps = {
  borrowerMarkets: MarketDataT[]
  selectedMarkets: MarketTableT[]
  setSelectedMarkets: Dispatch<SetStateAction<MarketTableT[]>>
  disabled?: boolean
}
