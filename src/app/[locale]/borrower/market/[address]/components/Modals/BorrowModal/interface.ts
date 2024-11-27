import { Market, MarketAccount } from "@wildcatfi/wildcat-sdk"

export type BorrowModalProps = {
  market: Market
  marketAccount: MarketAccount
  disableBorrowBtn: boolean
}
