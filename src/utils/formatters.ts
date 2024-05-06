// <---- MARKET CONSTRAINTS ---->
import { MarketParameterConstraints } from "@wildcatfi/wildcat-sdk"

const CONSTRAINTS_IN_SECONDS: Array<keyof MarketParameterConstraints> = [
  "minimumDelinquencyGracePeriod",
  "maximumDelinquencyGracePeriod",
  "minimumWithdrawalBatchDuration",
  "maximumWithdrawalBatchDuration",
]

export function formatConstrainToNumber(
  constraints: MarketParameterConstraints,
  key: keyof MarketParameterConstraints,
) {
  if (CONSTRAINTS_IN_SECONDS.indexOf(key) !== -1) {
    return constraints[key] / 60 / 60
  }

  return constraints[key] / 100
}