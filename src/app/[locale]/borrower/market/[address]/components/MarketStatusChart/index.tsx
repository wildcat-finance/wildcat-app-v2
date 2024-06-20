import { Box, Typography } from "@mui/material"

import { BarItem } from "@/components/BarChart/BarItem"
import { MarketBarChartItem } from "@/components/BarChart/BarItem/interface"
import { LegendItem } from "@/components/BarChart/LegendItem"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas, secondsToDays } from "@/utils/formatters"

import { CollateralObligationsData } from "./CollateralObligations/CollateralObligationsData"
import { DelinquentCollateralObligations } from "./CollateralObligations/DelinquentCollateralObligations"
import { MARKET_BAR_DATA, MARKET_BAR_ORDER } from "./constants"
import { useGenerateBarData } from "./hooks/useGenerateBarData"
import "./styles.css"
import { MarketStatusChartProps } from "./interface"
import { useGetWithdrawals } from "../../hooks/useGetWithdrawals"

export const MarketStatusChart = ({ market }: MarketStatusChartProps) => {
  const { data: withdrawals } = useGetWithdrawals(market)
  const barRawData = useGenerateBarData(market)

  const barOrders = market.isDelinquent
    ? MARKET_BAR_ORDER.delinquentBarsOrder
    : MARKET_BAR_ORDER.healthyBarchartOrder
  const legendItemsOrder = market.isDelinquent
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
      !market.isDelinquent
    )
      return "expandable"
    if (
      chartItem.id === MARKET_BAR_DATA.collateralObligations.id &&
      market.isDelinquent
    )
      return "extended"
    return "default"
  }

  const delinquencyPeriod =
    market.timeDelinquent > market.delinquencyGracePeriod
      ? 0
      : market.delinquencyGracePeriod - market.timeDelinquent
  const penaltyPeriod = market.timeDelinquent - market.delinquencyGracePeriod
  const marketStatus = {
    healthyPeriod: secondsToDays(Math.abs(market.timeDelinquent)),
    penaltyPeriod: secondsToDays(penaltyPeriod),
    delinquencyPeriod: secondsToDays(delinquencyPeriod),
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography variant="title3">Total Debt:</Typography>

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

      {!market.isDelinquent &&
        !market.isIncurringPenalties &&
        market.totalDebts.gt(0) && (
          <Box sx={{ display: "flex", columnGap: "3px", marginBottom: "24px" }}>
            <Typography variant="text3" sx={{ color: COLORS.santasGrey }}>
              Market has sufficient reserves to cover interest for
            </Typography>
            <Typography variant="text3" sx={{ color: COLORS.ultramarineBlue }}>
              {Math.floor(marketStatus.healthyPeriod)} days
            </Typography>
          </Box>
        )}

      {market.totalDebts.gt(0) && (
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
                {!market.isDelinquent && (
                  <Box className="barchart__legend-obligations-values-container">
                    <CollateralObligationsData
                      market={market}
                      withdrawals={withdrawals}
                    />
                  </Box>
                )}

                {market.isDelinquent && (
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
