import { LenderStatus } from "./interface"
import {
  getLenderBannerState,
  resolveLenderAccessState,
  shouldShowLenderTransactions,
} from "./utils"

const settled = {
  isWalletHydrated: true,
  isConnected: true,
  isConnecting: false,
  isReconnecting: false,
  isDifferentChain: false,
  accessState: "unauthorized" as const,
  hasLenderTransactions: false,
  isWithdrawalActivityLoading: false,
}

describe("lender access surfaces", () => {
  it.each([
    ["idle", LenderStatus.Null, "resolving"],
    ["resolving", LenderStatus.Null, "resolving"],
    ["error", LenderStatus.Null, "error"],
    ["resolved", LenderStatus.Null, "unauthorized"],
    ["resolved", LenderStatus.Blocked, "blocked"],
    ["resolved", LenderStatus.DepositAndWithdraw, "authorized"],
    ["resolved", LenderStatus.WithdrawOnly, "authorized"],
  ] as const)(
    "resolves %s with role %s to %s",
    (authoritativeStatus, role, expected) => {
      expect(resolveLenderAccessState({ authoritativeStatus, role })).toBe(
        expected,
      )
    },
  )

  it.each([
    [{ isWalletHydrated: false }, "none"],
    [{ isConnecting: true }, "none"],
    [{ isReconnecting: true }, "none"],
    [{ isConnected: false }, "connect"],
    [{ isDifferentChain: true }, "none"],
    [{ accessState: "resolving" }, "none"],
    [{ accessState: "error" }, "authorization-error"],
    [{ accessState: "blocked" }, "blocked"],
    [{ accessState: "authorized" }, "none"],
    [{ hasLenderTransactions: true }, "none"],
    [{ isWithdrawalActivityLoading: true }, "none"],
    [{}, "request-access"],
  ] as const)("uses the settled surface for %j", (changes, expected) => {
    expect(getLenderBannerState({ ...settled, ...changes })).toBe(expected)
  })

  it.each([
    ["authorized", false, false, true],
    ["unauthorized", false, false, false],
    ["unauthorized", true, false, true],
    ["blocked", false, true, true],
  ] as const)(
    "retains account sections for %s / balance %s / withdrawal %s",
    (accessState, hasMarketPosition, hasWithdrawalActivity, expected) => {
      expect(
        shouldShowLenderTransactions({
          accessState,
          hasMarketPosition,
          hasWithdrawalActivity,
        }),
      ).toBe(expected)
    },
  )
})
