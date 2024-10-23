import { Box, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { LenderWithdrawalsForMarketResult } from "@/app/[locale]/lender/market/[address]/hooks/useGetLenderWithdrawals"
import { BarItem } from "@/components/BarChart/BarItem"
import { formatTokenWithCommas } from "@/utils/formatters"

import { MARKET_BAR_ORDER } from "./constants"
import { useGenerateWithdrawalsBarData } from "./hooks/useGenerateWithdrawalsBarData"
import { LenderLegendItem } from "../components/LenderLegendItem"
import "../styles.css"
import { BarChartProps } from "../interface"

export const WithdrawalsBarChart = ({
  marketAccount,
  withdrawals,
}: BarChartProps & { withdrawals: LenderWithdrawalsForMarketResult }) => {
  const { t } = useTranslation()

  const { barData: barRawData, total } = useGenerateWithdrawalsBarData({
    market: marketAccount.market,
    lenderWithdrawals: withdrawals,
  })

  const { isDelinquent } = marketAccount.market

  const barOrders = !isDelinquent
    ? MARKET_BAR_ORDER.healthyBarchartOrder
    : MARKET_BAR_ORDER.delinquentBarchartOrder
  const legendItemsOrder = !isDelinquent
    ? MARKET_BAR_ORDER.healthyLegendOrder
    : MARKET_BAR_ORDER.delinquentLegendOrder

  const bars = barOrders
    .filter((barId) => barRawData[barId] !== undefined)
    .map((barId) => barRawData[barId])
    .filter((chartItem) => !chartItem.hide && !chartItem.value.raw.isZero())

  const legendItems = legendItemsOrder
    .filter((barId) => barRawData[barId] !== undefined)
    .map((barId) => barRawData[barId])

  return (
    <Box marginTop="12px">
      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography variant="title3">
          {t("lenderMarketDetails.barchart.withdrawals.title")}
        </Typography>

        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: "4px",
          }}
        >
          <Typography variant="title3">
            {formatTokenWithCommas(total)}
          </Typography>
          <Typography variant="text4" sx={{ marginTop: "4px" }}>
            {marketAccount.market.underlyingToken.symbol}
          </Typography>
        </Box>
      </Box>

      {total.gt(0) && !marketAccount.market.isClosed && (
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

      {total.gt(0) && (
        <Box sx={{ display: "flex", gap: "28px", marginTop: "24px" }}>
          {legendItems.map((chartItem) => (
            <LenderLegendItem
              key={chartItem.label}
              color={chartItem.color}
              label={chartItem.label}
              value={chartItem.value}
              asset={chartItem.asset}
            />
          ))}
        </Box>
      )}
    </Box>
  )
}
