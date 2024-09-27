import { Dispatch, SetStateAction } from "react"

import { MarketTableT } from "@/app/[locale]/borrower/edit-lenders/interface"
import { MarketDataT } from "@/app/[locale]/borrower/edit-lenders/lendersMock"
import { MarketTableDataType } from "@/app/[locale]/borrower/edit-lenders-list/interface"

export type AddSelectProps = {
  selectedMarkets: MarketTableDataType[]
  setSelectedMarkets: Dispatch<SetStateAction<MarketTableDataType[]>>
  disabled?: boolean
}
