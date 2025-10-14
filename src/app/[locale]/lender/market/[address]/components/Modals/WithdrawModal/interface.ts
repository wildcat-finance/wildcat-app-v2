import { Dispatch, SetStateAction } from "react"

import { MarketAccount } from "@wildcatfi/wildcat-sdk"

export type WithdrawModalProps = {
  marketAccount: MarketAccount
  isMobileOpen?: boolean
  setIsMobileOpen?: Dispatch<SetStateAction<boolean>>
}
