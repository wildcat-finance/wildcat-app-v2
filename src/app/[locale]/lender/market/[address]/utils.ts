import { LenderRole, MarketAccount } from "@wildcatfi/wildcat-sdk"
import { match } from "ts-pattern"

import { LenderStatus } from "./interface"

export const getEffectiveLenderRole = (account: MarketAccount): LenderStatus =>
  match(account.inferredRole)
    .with(LenderRole.DepositAndWithdraw, () => LenderStatus.DepositAndWithdraw)
    .with(LenderRole.WithdrawOnly, () => LenderStatus.WithdrawOnly)
    .with(LenderRole.Blocked, () => LenderStatus.Blocked)
    .otherwise(() => LenderStatus.Null)
