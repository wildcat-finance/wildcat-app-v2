import { LendersDataT, MarketDataT } from "./lendersMock"

export type MarketTableT = MarketDataT & {
  status: "new" | "old" | "deleted"
  prevStatus: "new" | "old" | "deleted"
}

export type LenderTableT = LendersDataT & {
  id: string
  status: "new" | "old" | "deleted"
  prevStatus: "new" | "old" | "deleted"
  markets: MarketTableT[]
}
