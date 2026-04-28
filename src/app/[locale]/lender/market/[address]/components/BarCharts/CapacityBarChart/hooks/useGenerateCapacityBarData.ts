import { MarketAccount, TokenAmount } from "@wildcatfi/wildcat-sdk"

import { MARKET_BAR_DATA } from "@/app/[locale]/lender/market/[address]/components/BarCharts/CapacityBarChart/constants"
import { MarketBarChartItem } from "@/components/BarChart/BarItem/interface"
import { formatTokenAmountPercentage } from "@/utils/formatters"

const getPercentageTokenAmount = (total: TokenAmount, amount: TokenAmount) =>
  formatTokenAmountPercentage(total, amount)

const getTokenAmountPercentageWidth = (
  total: TokenAmount,
  amount: TokenAmount,
) => `${getPercentageTokenAmount(total, amount)}`

export const useGenerateCapacityBarData = (
  account: MarketAccount,
): {
  [key: string]: MarketBarChartItem & { hide?: boolean }
} => {
  const barData: {
    [key: string]: MarketBarChartItem & { hide?: boolean }
  } = {}
  const { market } = account
  const asset = market.underlyingToken.symbol

  const total = market.maxTotalSupply

  const breakdown = market.getTotalDebtBreakdown()

  const colorKey =
    breakdown.status === "healthy" ? "healthyBgColor" : "delinquentBgColor"

  const textColorKey =
    breakdown.status === "healthy" ? "healthyTextColor" : "delinquentTextColor"

  const setBarData = (
    field: keyof typeof MARKET_BAR_DATA,
    value: TokenAmount,
    forceDisplay = false,
  ) => {
    if (value.lte(0) && total.gt(0) && !forceDisplay) return
    const {
      id,
      label,
      [colorKey]: color,
      [textColorKey]: textColor,
    } = MARKET_BAR_DATA[field]
    barData[id] = {
      id,
      label,
      value,
      asset,
      width: getTokenAmountPercentageWidth(total, value),
      color: total.gt(0) ? color : "transparent",
      textColor,
    }
  }

  // Always display "my loan" and "other loans" if either is non-zero
  setBarData("myLoan", account.marketBalance, market.totalSupply.gt(0))
  setBarData(
    "otherLoans",
    market.totalSupply.sub(account.marketBalance),
    market.totalSupply.gt(0),
  )
  setBarData("availableToLend", market.maximumDeposit, true)
  setBarData(
    "loaned",
    market.totalSupply.sub(account.marketBalance),
    market.totalSupply.gt(0),
  )

  return barData
}
