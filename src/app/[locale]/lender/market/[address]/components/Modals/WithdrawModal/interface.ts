import { Dispatch, SetStateAction } from "react"

import { MarketAccount, TokenWrapper } from "@wildcatfi/wildcat-sdk"

export type WithdrawModalProps = {
  marketAccount: MarketAccount
  wrapper?: TokenWrapper
  hasWrapper?: boolean
  isMobileOpen?: boolean
  setIsMobileOpen?: Dispatch<SetStateAction<boolean>>
}
