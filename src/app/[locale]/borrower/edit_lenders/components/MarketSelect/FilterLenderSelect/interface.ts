import { Dispatch, SetStateAction } from "react"

import { MarketDataT } from "../../../lendersMock"

export type FilterLenderSelectProps = {
  borrowerMarkets: MarketDataT[]
  selectedMarkets: MarketDataT[]
  setSelectedMarkets: Dispatch<SetStateAction<MarketDataT[]>>
}
