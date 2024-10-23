import * as React from "react"

import { Box } from "@mui/material"

import { WithdrawalsBarChart } from "@/app/[locale]/lender/market/[address]/components/BarCharts/WithdrawalsBarChart"
import { LenderWithdrawalsForMarketResult } from "@/app/[locale]/lender/market/[address]/hooks/useGetLenderWithdrawals"

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
}) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: "28px" }}>
    <CapacityBarChart
      marketAccount={marketAccount}
      legendType={isLender ? "small" : "big"}
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
