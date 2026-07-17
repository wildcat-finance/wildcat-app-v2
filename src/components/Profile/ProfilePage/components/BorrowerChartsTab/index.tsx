"use client"

import * as React from "react"

import { Box } from "@mui/material"

import { BorrowerProfileAnalytics } from "@/app/[locale]/borrower/profile/hooks/analytics/types"
import { useBorrowerAggregateDebt } from "@/app/[locale]/borrower/profile/hooks/analytics/useBorrowerAggregateDebt"
import { useBorrowerCapitalCostDrift } from "@/app/[locale]/borrower/profile/hooks/analytics/useBorrowerCapitalCostDrift"
import { LenderProfilePageContainer } from "@/app/[locale]/lender/profile/components/style"
import { AnalyticsUnavailableNotice } from "@/components/Profile/shared/AnalyticsUnavailableNotice"

import { AggregateDebtChart } from "./AggregateDebtChart"
import { AprDriftChart } from "./AprDriftChart"
import { CumulativeInterestChart } from "./CumulativeInterestChart"

type BorrowerChartsTabProps = {
  borrowerAddress: `0x${string}` | undefined
  chainId?: number
  analytics?: BorrowerProfileAnalytics
  isAnalyticsLoading: boolean
  analyticsAvailable: boolean
}

export const BorrowerChartsTab = ({
  borrowerAddress,
  chainId,
  analytics,
  isAnalyticsLoading,
  analyticsAvailable,
}: BorrowerChartsTabProps) => {
  const marketIds = analytics?.marketIds ?? []

  const capitalCostQuery = useBorrowerCapitalCostDrift({
    borrowerAddress,
    marketIds,
    priceMap: analytics?.priceMap ?? {},
    chainId,
  })
  const aggregateDebtQuery = useBorrowerAggregateDebt(
    borrowerAddress,
    marketIds,
    analytics?.priceMap ?? {},
    analytics?.nameMap ?? {},
  )

  const capitalCostPoints = capitalCostQuery.data ?? []
  const isCapitalCostLoading = isAnalyticsLoading || capitalCostQuery.isLoading
  const isAggregateDebtLoading =
    isAnalyticsLoading || aggregateDebtQuery.isLoading

  if (!analyticsAvailable) {
    return (
      <Box sx={LenderProfilePageContainer}>
        <AnalyticsUnavailableNotice />
      </Box>
    )
  }

  return (
    <Box sx={LenderProfilePageContainer}>
      <AprDriftChart
        points={capitalCostPoints}
        isLoading={isCapitalCostLoading}
      />

      <AggregateDebtChart
        data={aggregateDebtQuery.data}
        nameMap={analytics?.nameMap ?? {}}
        isLoading={isAggregateDebtLoading}
      />

      <CumulativeInterestChart
        points={capitalCostPoints}
        isLoading={isCapitalCostLoading}
      />
    </Box>
  )
}
