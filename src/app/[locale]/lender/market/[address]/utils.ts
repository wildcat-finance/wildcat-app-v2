import { LenderRole, MarketAccount } from "@wildcatfi/wildcat-sdk"

import { LenderStatus } from "./interface"

export const getEffectiveLenderRole = (
  account: MarketAccount,
): LenderStatus => {
  switch (account.inferredRole) {
    case LenderRole.DepositAndWithdraw:
      return LenderStatus.DepositAndWithdraw
    case LenderRole.WithdrawOnly:
      return LenderStatus.WithdrawOnly
    case LenderRole.Blocked:
      return LenderStatus.Blocked
    case LenderRole.Null:
    default:
      return LenderStatus.Null
  }
}
