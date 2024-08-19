import { Dispatch, SetStateAction } from "react"

type MarketType = {
  marketName: string
  address: string
  marketStatus: "added" | "regular" | "deleted"
}

type LednerDataType = {
  id: string
  isAuth: boolean
  address: string
  name: { name: string; address: string }
  markets: MarketType[]
  status: string
}

export type LenderMarketSelectProps = {
  chosenMarkets: MarketType[]
  borrowerMarkets: string[]
  type: "filter" | "add" | "table"
  lenderAddress: string
  setRows: Dispatch<SetStateAction<LednerDataType[]>>
  setNewLenderMarkets?: Dispatch<SetStateAction<MarketType[]>>
}
