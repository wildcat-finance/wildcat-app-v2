import { Box, Typography } from "@mui/material"
import humanizeDuration from "humanize-duration"

import { useGetWithdrawals } from "@/app/[locale]/borrower/market/[address]/hooks/useGetWithdrawals"
import { BarItem } from "@/components/BarChart/BarItem"
import { MarketBarChartItem } from "@/components/BarChart/BarItem/interface"
import { LegendItem } from "@/components/BarChart/LegendItem"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas } from "@/utils/formatters"

import { CollateralObligationsData } from "./CollateralObligations/CollateralObligationsData"
import { DelinquentCollateralObligations } from "./CollateralObligations/DelinquentCollateralObligations"
import { MARKET_BAR_DATA, MARKET_BAR_ORDER } from "./constants"
import { useGenerateBarData } from "./hooks/useGenerateBarData"
import "./styles.css"
import { MarketStatusChartProps } from "./interface"

export const MarketStatusChart = ({ market }: MarketStatusChartProps) => {
  const { data: withdrawals } = useGetWithdrawals(market)
  const { barData: barRawData, breakdown } = useGenerateBarData(market)
  const isDelinquent = breakdown.status === "delinquent"

  const barOrders = isDelinquent
    ? MARKET_BAR_ORDER.delinquentBarsOrder
    : MARKET_BAR_ORDER.healthyBarchartOrder
  const legendItemsOrder = isDelinquent
    ? MARKET_BAR_ORDER.delinquentLegendOrder
    : MARKET_BAR_ORDER.healthyLegendOrder

  const bars = barOrders
    .filter((barId) => barRawData[barId] !== undefined)
    .map((barId) => barRawData[barId])
    .filter((chartItem) => !chartItem.hide && !chartItem.value.raw.isZero())

  const legendItems = legendItemsOrder
    .filter((barId) => barRawData[barId] !== undefined)
    .map((barId) => barRawData[barId])

  const getLegendItemType = (
    chartItem: MarketBarChartItem & { hide?: boolean | undefined },
  ) => {
    if (
      chartItem.id === MARKET_BAR_DATA.collateralObligations.id &&
      !isDelinquent
    )
      return "expandable"
    if (
      chartItem.id === MARKET_BAR_DATA.collateralObligations.id &&
      isDelinquent
    )
      return "extended"
    return "default"
  }

  const remainingInterest =
    market.totalDebts.gt(0) && !market.isClosed
      ? humanizeDuration(market.secondsBeforeDelinquency * 1000, {
          round: true,
          largest: 1,
        })
      : ""

  return (
    <Box marginTop="12px">
      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography variant="title3">Total Debt</Typography>

        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: "4px",
          }}
        >
          <Typography variant="title3">
            {market.totalBorrowed &&
              `${formatTokenWithCommas(market.totalDebts)}`}
          </Typography>
          <Typography variant="text4" sx={{ marginTop: "4px" }}>
            {market.underlyingToken.symbol}
          </Typography>
        </Box>
      </Box>

      {!isDelinquent &&
        !market.isClosed &&
        !market.isIncurringPenalties &&
        market.totalDebts.gt(0) && (
          <Box sx={{ display: "flex", columnGap: "3px", marginBottom: "24px" }}>
            <Typography variant="text3" sx={{ color: COLORS.santasGrey }}>
              Market has sufficient reserves to cover interest for
            </Typography>
            <Typography variant="text3" sx={{ color: COLORS.ultramarineBlue }}>
              {remainingInterest}
            </Typography>
          </Box>
        )}

      {market.totalDebts.gt(0) && !market.isClosed && (
        <Box className="barchart__container">
          {bars.map((chartItem) => (
            <BarItem key={chartItem.id} chartItem={chartItem} />
          ))}
        </Box>
      )}

      <Box className="barchart__legend">
        {legendItems.map((chartItem) => (
          <LegendItem
            key={chartItem.label}
            chartItem={chartItem}
            type={getLegendItemType(chartItem)}
          >
            {chartItem.id === MARKET_BAR_DATA.collateralObligations.id && (
              <>
                {!isDelinquent && (
                  <Box className="barchart__legend-obligations-values-container">
                    <CollateralObligationsData
                      market={market}
                      withdrawals={withdrawals}
                    />
                  </Box>
                )}

                {isDelinquent && (
                  <Box className="barchart__legend-obligations-values-container">
                    <DelinquentCollateralObligations
                      market={market}
                      legendItem={chartItem}
                      withdrawals={withdrawals}
                    />
                  </Box>
                )}
              </>
            )}
          </LegendItem>
        ))}
      </Box>
    </Box>
  )
}
