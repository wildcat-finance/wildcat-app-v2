import { Dispatch, SetStateAction } from "react"

import { MarketAccount } from "@wildcatfi/wildcat-sdk"

export type TerminateModalV1FlowProps = {
  marketAccount: MarketAccount
  isOpen: boolean
  setIsOpen: Dispatch<SetStateAction<boolean>>
}
