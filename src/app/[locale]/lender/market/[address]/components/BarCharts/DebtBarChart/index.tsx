import { Box, Typography, useMediaQuery, useTheme } from "@mui/material"
import { useTranslation } from "react-i18next"

import { BarItem } from "@/components/BarChart/BarItem"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas } from "@/utils/formatters"

import { MARKET_BAR_ORDER } from "./constants"
import { useGenerateDebtsBarData } from "./hooks/useGenerateDebtsBarData"
import { LenderLegendItem } from "../components/LenderLegendItem"
import "../styles.css"
import { BarChartProps } from "../interface"

export const DebtBarChart = ({ marketAccount }: BarChartProps) => {
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMobileResolution()
  const barRawData = useGenerateDebtsBarData(marketAccount)
  const barOrders = MARKET_BAR_ORDER.healthyBarchartOrder
  const legendItemsOrder = MARKET_BAR_ORDER.healthyLegendOrder

  const bars = barOrders
    .filter((barId) => barRawData[barId] !== undefined)
    .map((barId) => barRawData[barId])
    .filter((chartItem) => !chartItem.hide && !chartItem.value.raw.isZero())

  const legendItems = legendItemsOrder
    .filter((barId) => barRawData[barId] !== undefined)
    .map((barId) => barRawData[barId])

  const { totalSupply } = marketAccount.market

  return (
    <Box marginTop="12px">
      <Box
        sx={{
          backgroundColor: isMobile ? COLORS.white : "transparent",
          borderRadius: isMobile ? "14px" : 0,
          padding: isMobile ? "12px 16px" : 0,
          overflow: isMobile ? "hidden" : "visible",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="title3">
              {t("lenderMarketDetails.barchart.debts.title")}
            </Typography>

            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: "4px",
              }}
            >
              <Typography variant="title3">
                {formatTokenWithCommas(totalSupply)}
              </Typography>
              <Typography variant="text4">
                {marketAccount.market.underlyingToken.symbol}
              </Typography>
            </Box>
          </Box>

          {totalSupply.gt(0) && (
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

          {totalSupply.gt(0) && (
            <Box
              sx={{
                display: "flex",
                gap: isMobile ? "0px" : "28px",
                marginTop: "16px",
                flexDirection: isMobile ? "column" : "row",
              }}
            >
              {legendItems.map((chartItem, index) => (
                <LenderLegendItem
                  key={chartItem.label}
                  color={chartItem.color}
                  label={chartItem.label}
                  value={chartItem.value}
                  asset={chartItem.asset}
                  withDivider={isMobile && index !== legendItems.length - 1}
                />
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  )
}
