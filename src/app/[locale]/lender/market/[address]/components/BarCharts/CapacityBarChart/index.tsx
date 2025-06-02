import { Box, Typography, useMediaQuery, useTheme } from "@mui/material"
import { useTranslation } from "react-i18next"

import { MARKET_BAR_ORDER } from "@/app/[locale]/lender/market/[address]/components/BarCharts/CapacityBarChart/constants"
import { useGenerateCapacityBarData } from "@/app/[locale]/lender/market/[address]/components/BarCharts/CapacityBarChart/hooks/useGenerateCapacityBarData"
import { LenderLegendItem } from "@/app/[locale]/lender/market/[address]/components/BarCharts/components/LenderLegendItem"
import { BarItem } from "@/components/BarChart/BarItem"
import { LegendItem } from "@/components/BarChart/LegendItem"
import { formatTokenWithCommas } from "@/utils/formatters"

import "../styles.css"
import { BarChartProps } from "../interface"

export const CapacityBarChart = ({
  marketAccount,
  legendType,
  isLender,
}: BarChartProps & { legendType?: "big" | "small"; isLender?: boolean }) => {
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"))

  const barRawData = useGenerateCapacityBarData(marketAccount)

  const barOrders = isLender
    ? MARKET_BAR_ORDER.healthyBarchartOrder
    : MARKET_BAR_ORDER.otherBarchartOrder
  const legendItemsOrder = isLender
    ? MARKET_BAR_ORDER.healthyLegendOrder
    : MARKET_BAR_ORDER.otherLegendOrder

  const bars = barOrders
    .filter((barId) => barRawData[barId] !== undefined)
    .map((barId) => barRawData[barId])
    .filter((chartItem) => !chartItem.hide && !chartItem.value.raw.isZero())

  const legendItems = legendItemsOrder
    .filter((barId) => barRawData[barId] !== undefined)
    .map((barId) => barRawData[barId])

  const marketCapacity = marketAccount.market.maxTotalSupply

  return (
    <Box marginTop="12px">
      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography variant="title3">
          {t("lenderMarketDetails.barchart.capacity.title")}
        </Typography>

        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: "4px",
          }}
        >
          <Typography variant="title3">
            {formatTokenWithCommas(marketCapacity)}
          </Typography>
          <Typography variant="text4" sx={{ marginTop: "4px" }}>
            {marketAccount.market.underlyingToken.symbol}
          </Typography>
        </Box>
      </Box>

      {marketCapacity.gt(0) && (
        <Box className="barchart__container">
          {bars.map((chartItem) => (
            <BarItem
              key={chartItem.id}
              chartItem={chartItem}
              isOnlyBarItem={bars.length === 1}
            />
          ))}
        </Box>
      )}

      {legendType === "big" && (
        <Box className="barchart__legend">
          {legendItems.map((chartItem) => (
            <LegendItem
              key={chartItem.label}
              chartItem={chartItem}
              type={isMobile ? "noBorderWithDivider" : "default"}
            />
          ))}
        </Box>
      )}

      {legendType === "small" && (
        <Box
          sx={{
            display: "flex",
            gap: "28px",
            marginTop: "24px",
            flexDirection: isMobile ? "column" : "row",
          }}
        >
          {legendItems.map((chartItem) => (
            <LenderLegendItem
              key={chartItem.label}
              color={chartItem.color}
              label={chartItem.label}
              value={chartItem.value}
              asset={chartItem.asset}
              withDivider={isMobile}
            />
          ))}
        </Box>
      )}
    </Box>
  )
}
