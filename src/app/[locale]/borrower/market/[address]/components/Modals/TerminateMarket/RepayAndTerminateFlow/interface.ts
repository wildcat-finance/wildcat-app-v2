import { UseMutateAsyncFunction } from "@tanstack/react-query"
import { MarketAccount } from "@wildcatfi/wildcat-sdk"

export type RepayAndTerminateFlowProps = {
  marketAccount: MarketAccount
  terminateFunc: UseMutateAsyncFunction<void, Error, void, unknown>
  isTerminating: boolean
  isOpen: boolean
  onClose: () => void
  errorPopup: boolean
  successPopup: boolean
  terminateTxHash: string | undefined
}
