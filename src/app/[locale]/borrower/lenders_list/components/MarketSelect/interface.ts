import { Dispatch, SetStateAction } from "react"

type MarketType = {
  marketName: string
  address: string
  marketStatus: "added" | "regular" | "deleted"
}

export type MarketSelectProps = {
  chosenMarkets: MarketType[]
  borrowerMarkets: string[]
  type: "filter" | "table" | "add"
  setChosenMarkets: Dispatch<SetStateAction<MarketType[]>>
}
