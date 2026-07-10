"use client"

import { Box } from "@mui/material"

import { LenderPositionsData } from "@/app/[locale]/lender/profile/hooks/types"
import { useLenderCapitalAtRiskTimeline } from "@/app/[locale]/lender/profile/hooks/useLenderCapitalAtRiskTimeline"

import { CapitalAtRiskTimeline } from "../LenderOverviewTab/CapitalAtRiskTimeline"
import { RiskReturnsChart } from "../LenderOverviewTab/RiskReturnsChart"

type TempTestChartsTabProps = {
  lenderAddress: `0x${string}` | undefined
  data?: LenderPositionsData
  isLoading: boolean
}

export const TempTestChartsTab = ({
  lenderAddress,
  data,
  isLoading,
}: TempTestChartsTabProps) => {
  const capitalAtRiskQuery = useLenderCapitalAtRiskTimeline({
    lenderAddress,
    marketIds: data?.marketIds ?? [],
    priceMap: data?.priceMap ?? {},
  })

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <RiskReturnsChart
        lenderAddress={lenderAddress}
        positions={data?.positions ?? []}
        priceMap={data?.priceMap ?? {}}
      />

      <CapitalAtRiskTimeline
        data={capitalAtRiskQuery.data}
        isLoading={isLoading || capitalAtRiskQuery.isLoading}
      />
    </Box>
  )
}
