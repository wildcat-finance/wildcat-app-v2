import { Market, TokenAmount, minTokenAmount } from "@wildcatfi/wildcat-sdk"
import { BigNumber } from "ethers"
import { formatEther } from "ethers/lib/utils"

import { MarketBarChartItem } from "@/components/BarChart/BarItem/interface"

import { MARKET_BAR_DATA } from "../constants"

const ONE_HUNDRED_E18 = BigNumber.from(10).pow(20)
const getPercentageTokenAmount = (total: TokenAmount, amount: TokenAmount) =>
  total.eq(0)
    ? 0
    : parseFloat(formatEther(amount.raw.mul(ONE_HUNDRED_E18).div(total.raw)))

const getTokenAmountPercentageWidth = (
  total: TokenAmount,
  amount: TokenAmount,
) => `${getPercentageTokenAmount(total, amount)}`

export const useGenerateDebtsBarData = ({
  market,
}: {
  market: Market
}): {
  [key: string]: MarketBarChartItem & { hide?: boolean }
} => {
  const barData: {
    [key: string]: MarketBarChartItem & { hide?: boolean }
  } = {}
  const breakdown = market.getTotalDebtBreakdown()
  const isDelinquent = breakdown.status === "delinquent"
  const totalClaims = market.normalizedUnclaimedWithdrawals
    .add(market.normalizedPendingWithdrawals)
    .add(market.lastAccruedProtocolFees)
  const locked = minTokenAmount(market.totalAssets, totalClaims)
  const liquid = market.totalAssets.sub(locked)
  const borrowed = market.totalDebts.sub(market.totalAssets)
  const asset = market.underlyingToken.symbol

  const total = market.totalDebts

  const colorKey = !isDelinquent ? "healthyBgColor" : "delinquentBgColor"

  const textColorKey = !isDelinquent
    ? "healthyTextColor"
    : "delinquentTextColor"

  const setBarData = (
    field: keyof typeof MARKET_BAR_DATA,
    value: TokenAmount,
  ) => {
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

  setBarData("locked", locked)
  setBarData("liquid", liquid)
  setBarData("borrowed", borrowed)

  return barData
}
