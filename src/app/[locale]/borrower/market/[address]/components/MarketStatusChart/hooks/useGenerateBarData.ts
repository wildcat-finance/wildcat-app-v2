import { Market, TokenAmount } from "@wildcatfi/wildcat-sdk"
import { BigNumber } from "ethers"
import { formatEther } from "ethers/lib/utils"

import { MARKET_BAR_DATA } from "@/app/[locale]/borrower/market/[address]/components/MarketStatusChart/constants"
import { MarketBarChartItem } from "@/components/BarChart/BarItem/interface"

const ONE_HUNDRED_E18 = BigNumber.from(10).pow(20)

const getPercentageTokenAmount = (total: TokenAmount, amount: TokenAmount) =>
  total.eq(0)
    ? 0
    : parseFloat(formatEther(amount.raw.mul(ONE_HUNDRED_E18).div(total.raw)))

const getTokenAmountPercentageWidth = (
  total: TokenAmount,
  amount: TokenAmount,
) => `${getPercentageTokenAmount(total, amount)}`

export const useGenerateBarData = (
  market: Market,
): {
  [key: string]: MarketBarChartItem & { hide?: boolean }
} => {
  const breakdown = market.getTotalDebtBreakdown()
  const barData: {
    [key: string]: MarketBarChartItem & { hide?: boolean }
  } = {}
  const asset = market.underlyingToken.symbol

  const { totalDebt } = breakdown

  const colorKey =
    breakdown.status === "healthy" ? "healthyBgColor" : "delinquentBgColor"

  const textColorKey =
    breakdown.status === "healthy" ? "healthyTextColor" : "delinquentTextColor"

  const setBarData = (
    field: keyof typeof MARKET_BAR_DATA,
    value: TokenAmount,
  ) => {
    if (value.lte(0) && totalDebt.gt(0)) return
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
      width: getTokenAmountPercentageWidth(totalDebt, value),
      color: totalDebt.gt(0) ? color : "transparent",
      textColor,
    }
  }
  if (breakdown.status === "delinquent") {
    setBarData("collateralObligations", breakdown.collateralObligation)
    setBarData("delinquentDebt", breakdown.delinquentDebt)
    setBarData("currentReserves", breakdown.reserves)
    setBarData("borrowed", breakdown.borrowed)
  } else {
    setBarData("availableToBorrow", breakdown.borrowable)
    setBarData("collateralObligations", breakdown.collateralObligation)
    setBarData("borrowed", breakdown.borrowed)
  }

  return barData
}
