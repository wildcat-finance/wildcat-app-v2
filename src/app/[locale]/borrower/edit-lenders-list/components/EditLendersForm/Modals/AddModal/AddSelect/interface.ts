import { Dispatch, SetStateAction } from "react"

import { MarketTableDataType } from "@/app/[locale]/borrower/edit-lenders-list/interface"

export type AddSelectProps = {
  selectedMarkets: MarketTableDataType[]
  setSelectedMarkets: Dispatch<SetStateAction<MarketTableDataType[]>>
  disabled?: boolean
}
