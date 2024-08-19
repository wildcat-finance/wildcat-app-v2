import type { Dispatch, SetStateAction } from "react"

type MarketType = {
  marketStatus: "added" | "regular" | "deleted"
  marketName: string
  address: string
}

export type AddLenderModalProps = {
  setRows: Dispatch<
    SetStateAction<
      {
        id: string
        isAuth: boolean
        address: string
        name: { name: string; address: string }
        markets: MarketType[]
        status: string
      }[]
    >
  >
  setLendersName: Dispatch<SetStateAction<{ [key: string]: string }>>
}

export type ChosenMarketType = MarketType[]
