import { Box, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { MARKET_BAR_ORDER } from "@/app/[locale]/lender/market/[address]/constants"
import { useGenerateLenderBarData } from "@/app/[locale]/lender/market/[address]/hooks/useGenerateLenderBarData"
import { BarItem } from "@/components/BarChart/BarItem"
import { LegendItem } from "@/components/BarChart/LegendItem"
import { formatTokenWithCommas } from "@/utils/formatters"

import "./styles.css"
import { CapacityBarChartProps } from "./interface"

export const CapacityBarChart = ({ marketAccount }: CapacityBarChartProps) => {
  const { t } = useTranslation()

  const barRawData = useGenerateLenderBarData(marketAccount)

  const barOrders = MARKET_BAR_ORDER.healthyBarchartOrder
  const legendItemsOrder = MARKET_BAR_ORDER.healthyLegendOrder

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

      {marketCapacity.gt(0) && !marketAccount.market.isClosed && (
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

      <Box className="barchart__legend">
        {legendItems.map((chartItem) => (
          <LegendItem
            key={chartItem.label}
            chartItem={chartItem}
            type="default"
          />
        ))}
      </Box>
    </Box>
  )
}
