import { Market, TokenAmount, TotalDebtBreakdown } from "@wildcatfi/wildcat-sdk"
import { BigNumber } from "ethers"

import { MARKET_BAR_DATA } from "@/app/[locale]/borrower/market/[address]/components/MarketStatusChart/constants"
import { MarketBarChartItem } from "@/components/BarChart/BarItem/interface"
import { getTokenAmountPercentageWidth } from "@/components/BarChart/tokenAmountPercent"

export const useGenerateBarData = (
  market: Market,
): {
  breakdown: TotalDebtBreakdown
  barData: {
    [key: string]: MarketBarChartItem & { hide?: boolean }
  }
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
    const borrowed = breakdown.borrowed.raw.lt(0)
      ? new TokenAmount(BigNumber.from(0), market.underlyingToken)
      : breakdown.borrowed
    setBarData("borrowed", borrowed)
  }

  return { barData, breakdown }
}
