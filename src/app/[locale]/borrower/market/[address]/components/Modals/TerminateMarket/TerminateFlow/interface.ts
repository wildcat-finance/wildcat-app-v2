import { UseMutateAsyncFunction } from "@tanstack/react-query"

export type TerminateFlowProps = {
  terminateFunc: UseMutateAsyncFunction<void, Error, void, unknown>
  isTerminating: boolean
  isOpen: boolean
  onClose: () => void
  errorPopup: boolean
  successPopup: boolean
  txHash: string | undefined
}
