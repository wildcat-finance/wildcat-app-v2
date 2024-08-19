import { useEffect, useState } from "react"

import { LenderMarketSelectProps } from "./interface"
import { MarketSelect } from "../MarketSelect"

export const LenderMarketSelect = ({
  chosenMarkets,
  borrowerMarkets,
  type,
  lenderAddress,
  setRows,
  setNewLenderMarkets,
}: LenderMarketSelectProps) => {
  const [lenderMarket, setLenderMarket] = useState(chosenMarkets)

  useEffect(() => {
    if (type === "add") {
      if (setNewLenderMarkets) setNewLenderMarkets(lenderMarket)
    }
    if (type === "table") {
      setRows((prev) =>
        prev.map((item) => {
          if (item.address === lenderAddress)
            item.markets = lenderMarket.map((market) => ({
              marketName: market.marketName,
              address: "",
              marketStatus: "added",
            }))
          return item
        }),
      )
    }
  }, [lenderMarket])

  return (
    <MarketSelect
      chosenMarkets={lenderMarket}
      borrowerMarkets={borrowerMarkets || []}
      type={type}
      setChosenMarkets={setLenderMarket}
    />
  )
}
