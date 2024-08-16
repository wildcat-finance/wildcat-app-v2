import { useState } from "react"

import { MarketSelect } from "../MarketSelect"

export type LenderMarketSelectProps = {
  chosenMarkets: string[]
  borrowerMarkets: string[]
  type: "filter" | "add"
}

export const LenderMarketSelect = ({
  chosenMarkets,
  borrowerMarkets,
  type,
}: LenderMarketSelectProps) => {
  const [lenderMarket, setLenderMarket] = useState(chosenMarkets)
  return (
    <MarketSelect
      chosenMarkets={lenderMarket}
      borrowerMarkets={borrowerMarkets || []}
      type={type}
      setChosenMarkets={setLenderMarket}
    />
  )
}
