import { Market, TokenAmount } from "@wildcatfi/wildcat-sdk"
import { BigNumber } from "ethers"
import { formatEther } from "ethers/lib/utils"

import { MARKET_BAR_DATA } from "@/app/[locale]/lender/market/[address]/components/BarCharts/WithdrawalsBarChart/constants"
import { LenderWithdrawalsForMarketResult } from "@/app/[locale]/lender/market/[address]/hooks/useGetLenderWithdrawals"
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

export const useGenerateWithdrawalsBarData = ({
  lenderWithdrawals,
  market,
}: {
  lenderWithdrawals: LenderWithdrawalsForMarketResult
  market: Market
}): {
  barData: { [key: string]: MarketBarChartItem & { hide?: boolean } }
  total: TokenAmount
} => {
  const barData: {
    [key: string]: MarketBarChartItem & { hide?: boolean }
  } = {}

  const claimable = lenderWithdrawals.totalClaimableAmount
  const ongoing = lenderWithdrawals.activeTotalPendingAmount
  const outstanding = lenderWithdrawals.expiredTotalPendingAmount
  const asset = market.underlyingToken.symbol
  const total = claimable.add(ongoing).add(outstanding)

  const colorKey = !market.isDelinquent ? "healthyBgColor" : "delinquentBgColor"
  const textColorKey = !market.isDelinquent
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

  setBarData("claimable", claimable)
  setBarData("ongoing", ongoing)
  setBarData("outstanding", outstanding)

  return { barData, total }
}
