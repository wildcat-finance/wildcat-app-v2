import * as React from "react"

import { Box } from "@mui/material"

import { WithdrawalsBarChart } from "@/app/[locale]/lender/market/[address]/components/BarCharts/WithdrawalsBarChart"
import { LenderWithdrawalsForMarketResult } from "@/app/[locale]/lender/market/[address]/hooks/useGetLenderWithdrawals"
import { LenderMarketSections } from "@/store/slices/lenderMarketRoutingSlice/lenderMarketRoutingSlice"

import { CapacityBarChart } from "./CapacityBarChart"
import { DebtBarChart } from "./DebtBarChart"
import { BarChartProps } from "./interface"

export const BarCharts = ({
  marketAccount,
  withdrawals,
}: BarChartProps & { withdrawals: LenderWithdrawalsForMarketResult }) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: "28px" }}>
    <CapacityBarChart
      marketAccount={marketAccount}
      section={LenderMarketSections.STATUS}
    />
    <DebtBarChart marketAccount={marketAccount} />
    <WithdrawalsBarChart
      marketAccount={marketAccount}
      withdrawals={withdrawals}
    />
  </Box>
)
