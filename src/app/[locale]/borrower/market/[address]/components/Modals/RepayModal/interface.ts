import { MarketAccount } from "@wildcatfi/wildcat-sdk"

export type RepayModalProps = {
  buttonType?: "marketHeader" | "withdrawalTable"
  marketAccount: MarketAccount
  disableRepayBtn?: boolean
}
