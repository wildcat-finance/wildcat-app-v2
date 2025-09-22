import * as React from "react"

import { Box, useTheme, useMediaQuery } from "@mui/material"

import { WithdrawalsBarChart } from "@/app/[locale]/lender/market/[address]/components/BarCharts/WithdrawalsBarChart"
import { LenderWithdrawalsForMarketResult } from "@/app/[locale]/lender/market/[address]/hooks/useGetLenderWithdrawals"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"

import { CapacityBarChart } from "./CapacityBarChart"
import { DebtBarChart } from "./DebtBarChart"
import { BarChartProps } from "./interface"

export const BarCharts = ({
  marketAccount,
  withdrawals,
  isLender,
}: BarChartProps & {
  withdrawals: LenderWithdrawalsForMarketResult
  isLender: boolean
}) => {
  const isMobile = useMobileResolution()

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: isMobile ? "16px" : "28px",
        backgroundColor: isMobile ? COLORS.white : "transparent",
        borderRadius: isMobile ? "14px" : 0,
      }}
    >
      <CapacityBarChart
        marketAccount={marketAccount}
        legendType={isLender ? "small" : "big"}
        isLender={isLender}
      />
      {isLender && <DebtBarChart marketAccount={marketAccount} />}
      {isLender && (
        <WithdrawalsBarChart
          marketAccount={marketAccount}
          withdrawals={withdrawals}
        />
      )}
    </Box>
  )
}
