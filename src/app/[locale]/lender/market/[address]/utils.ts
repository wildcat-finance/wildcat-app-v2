import { LenderRole, MarketAccount } from "@wildcatfi/wildcat-sdk"

import { LenderStatus } from "./interface"

export const getEffectiveLenderRole = (
  account: MarketAccount,
): LenderStatus => {
  if (account.role === LenderRole.Null && account.isAuthorizedOnController)
    return LenderStatus.DepositAndWithdraw
  switch (account.role) {
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
