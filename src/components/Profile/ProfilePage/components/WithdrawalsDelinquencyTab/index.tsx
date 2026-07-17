"use client"

import * as React from "react"

import { Box, Skeleton, Typography } from "@mui/material"

import { BorrowerProfileAnalytics } from "@/app/[locale]/borrower/profile/hooks/analytics/types"
import { useBorrowerBatches } from "@/app/[locale]/borrower/profile/hooks/analytics/useBorrowerBatches"
import { useBorrowerDelinquencyEvents } from "@/app/[locale]/borrower/profile/hooks/analytics/useBorrowerDelinquencyEvents"
import {
  LenderProfilePageContainer,
  LenderProfilePageSection,
  LenderProfilePageTitleContainer,
} from "@/app/[locale]/lender/profile/components/style"
import { AnalyticsUnavailableNotice } from "@/components/Profile/shared/AnalyticsUnavailableNotice"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"

import { BatchOutcomesChart } from "./BatchOutcomesChart"
import { DelinquentTimeByMarket } from "./DelinquentTimeByMarket"
import { MetricStrip } from "./MetricStrip"
import { PendingWithdrawalBanner } from "../OverviewTab/PendingWithdrawalBanner"

type WithdrawalsDelinquencyTabProps = {
  borrowerAddress: `0x${string}` | undefined
  chainId?: number
  analytics?: BorrowerProfileAnalytics
  isAnalyticsLoading: boolean
  analyticsAvailable: boolean
}

const formatDays = (hours: number) =>
  `${Math.round((Number.isFinite(hours) ? hours : 0) / 24)}d`

export const WithdrawalsDelinquencyTab = ({
  borrowerAddress,
  chainId,
  analytics,
  isAnalyticsLoading,
  analyticsAvailable,
}: WithdrawalsDelinquencyTabProps) => {
  const isMobile = useMobileResolution()
  const batchRef = React.useRef<HTMLDivElement | null>(null)

  const marketIds = analytics?.marketIds ?? []
  const delinquencyQuery = useBorrowerDelinquencyEvents(
    borrowerAddress,
    marketIds,
    analytics?.gracePeriodMap ?? {},
    analytics?.nameMap ?? {},
    chainId,
  )
  const batchesQuery = useBorrowerBatches(
    borrowerAddress,
    marketIds,
    analytics?.priceMap ?? {},
    chainId,
  )

  const events = React.useMemo(
    () => delinquencyQuery.data ?? [],
    [delinquencyQuery.data],
  )
  const delinquencyMetrics = React.useMemo(
    () => ({
      totalEvents: events.length,
      penaltyEvents: events.filter((event) => event.penalized).length,
      longestHours: events.reduce(
        (max, event) => Math.max(max, event.durationHours),
        0,
      ),
      avgHours:
        events.length > 0
          ? events.reduce((sum, event) => sum + event.durationHours, 0) /
            events.length
          : 0,
    }),
    [events],
  )

  const wd = batchesQuery.data
  const totalExpired = wd?.totalExpired ?? 0
  const paidCount = wd ? totalExpired - wd.paidLateCount - wd.unpaidCount : 0
  const sharePct = (count: number) =>
    totalExpired > 0 ? Math.round((count / totalExpired) * 100) : 0

  const isDelinquencyLoading = isAnalyticsLoading || delinquencyQuery.isLoading
  const isBatchesLoading = isAnalyticsLoading || batchesQuery.isLoading

  if (!analyticsAvailable) {
    return (
      <Box sx={LenderProfilePageContainer}>
        <AnalyticsUnavailableNotice />
      </Box>
    )
  }

  return (
    <Box sx={LenderProfilePageContainer}>
      <Box sx={LenderProfilePageSection}>
        <Box sx={LenderProfilePageTitleContainer}>
          <Typography variant={isMobile ? "mobH3" : "title3"}>
            Delinquency track record
          </Typography>
          <Typography
            variant={isMobile ? "mobText2" : "text2"}
            sx={{ opacity: 0.7 }}
          >
            How often markets go delinquent and how quickly they cure
          </Typography>
        </Box>

        <MetricStrip
          isLoading={isDelinquencyLoading}
          items={[
            {
              label: "Total events",
              value: String(delinquencyMetrics.totalEvents),
            },
            {
              label: "Penalty events",
              value: String(delinquencyMetrics.penaltyEvents),
            },
            {
              label: "Longest event",
              value: formatDays(delinquencyMetrics.longestHours),
            },
            {
              label: "Avg cure time",
              value: formatDays(delinquencyMetrics.avgHours),
            },
          ]}
        />

        <Box sx={{ marginTop: "36px" }}>
          <Box sx={{ marginBottom: "24px" }}>
            <Typography variant="text2Highlighted" display="block">
              Delinquent time by market
            </Typography>
            <Typography variant="text2" sx={{ opacity: 0.7 }}>
              Aggregated time spent delinquent across markets with at least one
              event
            </Typography>
          </Box>

          {isDelinquencyLoading ? (
            <Skeleton
              variant="rounded"
              height={280}
              sx={{ bgcolor: COLORS.athensGrey }}
            />
          ) : (
            <DelinquentTimeByMarket
              events={events}
              gracePeriodMap={analytics?.gracePeriodMap ?? {}}
              chainId={chainId}
            />
          )}
        </Box>
      </Box>

      <Box sx={LenderProfilePageSection} ref={batchRef}>
        <Box sx={LenderProfilePageTitleContainer}>
          <Typography variant={isMobile ? "mobH3" : "title3"}>
            Withdrawal processing
          </Typography>
          <Typography
            variant={isMobile ? "mobText2" : "text2"}
            sx={{ opacity: 0.7 }}
          >
            How you&apos;re doing repaying withdrawal batches at expiry
          </Typography>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {wd && wd.pendingBatches > 0 && (
            <PendingWithdrawalBanner
              count={wd.pendingBatches}
              queuedValue={wd.totalQueued}
              nextExpiry={wd.nextExpiry}
              onViewQueue={() =>
                batchRef.current?.scrollIntoView({ behavior: "smooth" })
              }
            />
          )}

          <MetricStrip
            isLoading={isBatchesLoading}
            items={[
              { label: "Expired batches", value: String(totalExpired) },
              {
                label: "Fully paid at expiry",
                value: String(paidCount),
                suffix: `${wd?.fullyPaidPct ?? 0}%`,
              },
              {
                label: "Paid late",
                value: String(wd?.paidLateCount ?? 0),
                suffix: `${sharePct(wd?.paidLateCount ?? 0)}%`,
                tooltip:
                  "Batches whose full amount was only repaid after the batch expired.",
              },
              {
                label: "Unpaid",
                value: String(wd?.unpaidCount ?? 0),
                suffix: `${sharePct(wd?.unpaidCount ?? 0)}%`,
              },
            ]}
          />

          <BatchOutcomesChart
            batches={wd?.batches ?? []}
            isLoading={isBatchesLoading}
          />
        </Box>
      </Box>
    </Box>
  )
}
