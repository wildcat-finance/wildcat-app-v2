"use client"

import * as React from "react"

import { Box, Tooltip, Typography } from "@mui/material"
import { GridColDef } from "@mui/x-data-grid"
import Link from "next/link"

import {
  getBorrowerDisplayName,
  useBorrowerNames,
} from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import { LenderPositionsData } from "@/app/[locale]/lender/profile/hooks/types"
import { useLenderActivity } from "@/app/[locale]/lender/profile/hooks/useLenderActivity"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { LinkGroup } from "@/components/LinkComponent"
import { MobileAnalyticsCard } from "@/components/Mobile/MobileAnalyticsCard"
import { formatPercent, formatUsd } from "@/components/Profile/shared/analytics"
import { AnalyticsDataGrid } from "@/components/Profile/shared/AnalyticsDataGrid"
import { ProfileSectionPanel } from "@/components/Profile/shared/ProfileSectionPanel"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import {
  buildBorrowerProfileHref,
  buildMarketHref,
  trimAddress,
} from "@/utils/formatters"
import { MarketStatus } from "@/utils/marketStatus"

import { LenderOverviewHeader } from "./LenderOverviewHeader"

type LenderOverviewTabProps = {
  lenderAddress: `0x${string}` | undefined
  data?: LenderPositionsData
  isLoading: boolean
}

const getPositionMarketStatus = (
  status: "Active" | "Delinquent" | "Penalty" | "Closed",
) => {
  const statusMap = {
    Active: MarketStatus.HEALTHY,
    Delinquent: MarketStatus.DELINQUENT,
    Penalty: MarketStatus.PENALTY,
    Closed: MarketStatus.TERMINATED,
  } as const

  return {
    status: statusMap[status],
    healthyPeriod: null,
    penaltyPeriod: 0,
    delinquencyPeriod: 0,
  }
}

const TextCell = ({ children }: { children: React.ReactNode }) => (
  <Typography variant="text3">{children}</Typography>
)

const RightTextCell = ({ children }: { children: React.ReactNode }) => (
  <Typography variant="text3" width="100%" textAlign="right">
    {children}
  </Typography>
)

const ProfileAddressCell = ({
  address,
  displayName,
  profileHref,
  explorerHref,
}: {
  address: string
  displayName?: string
  profileHref: string
  explorerHref: string
}) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
    <Tooltip title={address} placement="top">
      <Link href={profileHref}>
        <Typography component="span" variant="text3" color={COLORS.blackRock}>
          {displayName ?? trimAddress(address)}
        </Typography>
      </Link>
    </Tooltip>
    <LinkGroup linkValue={explorerHref} copyValue={address} />
  </Box>
)

export const LenderOverviewTab = ({
  lenderAddress,
  data,
  isLoading,
}: LenderOverviewTabProps) => {
  const { data: borrowers } = useBorrowerNames()
  const isMobile = useMobileResolution()
  const { chainId } = useSelectedNetwork()
  const { getAddressUrl } = useBlockExplorer()
  const activityQuery = useLenderActivity(
    lenderAddress,
    data?.marketIds ?? [],
    data?.decimalsMap ?? {},
    data?.priceMap ?? {},
  )
  const positions = data?.positions ?? []
  const positionsWithBorrowerNames = React.useMemo(
    () =>
      positions.map((position) => ({
        ...position,
        borrowerName: getBorrowerDisplayName(position.borrower, borrowers),
        borrowerDisplayName: getBorrowerDisplayName(
          position.borrower,
          borrowers,
          "name",
        ),
      })),
    [borrowers, positions],
  )
  const activePositions = positionsWithBorrowerNames
    .filter((position) => position.currentBalance > 0)
    .filter((position) => position.status !== "Closed")
    .sort((left, right) => right.currentBalance - left.currentBalance)

  type PositionWithBorrowerName = (typeof positionsWithBorrowerNames)[number]
  const buildBorrowerExposureRows = (
    sourcePositions: PositionWithBorrowerName[],
    getExposure: (position: PositionWithBorrowerName) => number,
  ) => {
    const totalExposure = sourcePositions.reduce(
      (sum, position) => sum + getExposure(position),
      0,
    )
    const rows = new Map<
      string,
      {
        id: string
        borrower: string
        borrowerName: string
        marketCount: number
        exposure: number
        share: number
      }
    >()

    sourcePositions.forEach((position) => {
      const exposure = getExposure(position)
      if (exposure <= 0) return

      const existing = rows.get(position.borrower) ?? {
        id: position.borrower,
        borrower: position.borrower,
        borrowerName: position.borrowerName,
        marketCount: 0,
        exposure: 0,
        share: 0,
      }

      existing.marketCount += 1
      existing.exposure += exposure
      rows.set(position.borrower, existing)
    })

    return Array.from(rows.values())
      .map((row) => ({
        ...row,
        share: totalExposure > 0 ? (row.exposure / totalExposure) * 100 : 0,
      }))
      .sort((left, right) => right.exposure - left.exposure)
  }

  const borrowerExposureRows = React.useMemo(
    () =>
      buildBorrowerExposureRows(
        activePositions,
        (position) => position.currentBalance,
      ),
    [activePositions],
  )

  const historicalBorrowerExposureRows = React.useMemo(
    () =>
      buildBorrowerExposureRows(
        positionsWithBorrowerNames,
        (position) => position.totalDeposited,
      ),
    [positionsWithBorrowerNames],
  )

  const positionColumns: GridColDef[] = [
    {
      field: "marketName",
      headerName: "Market",
      flex: 1.5,
      minWidth: 220,
      renderCell: ({ row, value }) => (
        <Link
          href={buildMarketHref(row.marketId, undefined, ROUTES.lender.market)}
        >
          <Typography component="span" variant="text3" color={COLORS.blackRock}>
            {value}
          </Typography>
        </Link>
      ),
    },
    {
      field: "borrowerDisplayName",
      headerName: "Borrower",
      flex: 1.4,
      minWidth: 240,
      renderCell: ({ row, value }) => (
        <ProfileAddressCell
          address={row.borrower}
          displayName={value}
          profileHref={buildBorrowerProfileHref(row.borrower, chainId)}
          explorerHref={getAddressUrl(row.borrower)}
        />
      ),
    },
    {
      field: "asset",
      headerName: "Asset",
      minWidth: 80,
      renderCell: ({ value }) => <TextCell>{value}</TextCell>,
    },
    {
      field: "currentBalance",
      headerName: "Balance",
      minWidth: 130,
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => (
        <RightTextCell>
          {formatUsd(value as number, { compact: true })}
        </RightTextCell>
      ),
    },
    {
      field: "totalDeposited",
      headerName: "Deposited",
      minWidth: 130,
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => (
        <RightTextCell>
          {formatUsd(value as number, { compact: true })}
        </RightTextCell>
      ),
    },
    {
      field: "interestEarned",
      headerName: "Interest",
      minWidth: 130,
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => (
        <RightTextCell>
          {formatUsd(value as number, { compact: true })}
        </RightTextCell>
      ),
    },
    {
      field: "apr",
      headerName: "APR",
      minWidth: 110,
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => (
        <RightTextCell>{formatPercent(value as number)}</RightTextCell>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      minWidth: 120,
      renderCell: ({ value }) => (
        <MarketStatusChip
          status={getPositionMarketStatus(
            value as "Active" | "Delinquent" | "Penalty" | "Closed",
          )}
          withPeriod={false}
        />
      ),
    },
  ]

  const borrowerExposureColumns: GridColDef[] = [
    {
      field: "borrower",
      headerName: "Borrower",
      flex: 1.2,
      minWidth: 180,
      renderCell: ({ value }) => (
        <ProfileAddressCell
          address={value}
          profileHref={buildBorrowerProfileHref(value, chainId)}
          explorerHref={getAddressUrl(value)}
        />
      ),
    },
    {
      field: "borrowerName",
      headerName: "Name",
      flex: 1,
      minWidth: 160,
      renderCell: ({ value }) => <TextCell>{value}</TextCell>,
    },
    {
      field: "marketCount",
      headerName: "Markets",
      minWidth: 110,
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => <RightTextCell>{value}</RightTextCell>,
    },
    {
      field: "exposure",
      headerName: "Exposure",
      minWidth: 140,
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => (
        <RightTextCell>
          {formatUsd(value as number, { compact: true })}
        </RightTextCell>
      ),
    },
    {
      field: "share",
      headerName: "Portfolio Share",
      minWidth: 150,
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => (
        <RightTextCell>{formatPercent(value as number, 1)}</RightTextCell>
      ),
    },
  ]

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: { xs: "2px", md: "24px" },
      }}
    >
      <LenderOverviewHeader
        lenderAddress={lenderAddress}
        data={data}
        activity={activityQuery.data}
        isLoading={isLoading}
      />

      <ProfileSectionPanel title="Active positions">
        <AnalyticsDataGrid
          loading={isLoading}
          rows={activePositions}
          columns={positionColumns}
          noRowsLabel="No active positions for this lender."
          minWidth={980}
          maxHeight={isMobile ? 520 : 560}
          renderMobileRow={(row) => (
            <MobileAnalyticsCard
              href={buildMarketHref(
                row.marketId,
                undefined,
                ROUTES.lender.market,
              )}
              title={row.marketName}
              titleSub={
                <Typography variant="text4" color={COLORS.santasGrey}>
                  {row.borrowerDisplayName} · {row.asset}
                </Typography>
              }
              headerRight={
                <MarketStatusChip
                  status={getPositionMarketStatus(row.status)}
                  withPeriod={false}
                />
              }
              headlineValue={formatUsd(row.currentBalance, { compact: true })}
              headlineLabel="Balance"
              rows={[
                {
                  label: "Deposited",
                  value: formatUsd(row.totalDeposited, { compact: true }),
                },
                {
                  label: "Interest earned",
                  value: formatUsd(row.interestEarned, { compact: true }),
                },
                { label: "APR", value: formatPercent(row.apr) },
              ]}
            />
          )}
        />
      </ProfileSectionPanel>

      <ProfileSectionPanel title="Borrower exposure">
        <AnalyticsDataGrid
          loading={isLoading}
          rows={borrowerExposureRows}
          columns={borrowerExposureColumns}
          noRowsLabel="No active borrower exposure."
          minWidth={700}
          maxHeight={isMobile ? 520 : 560}
          renderMobileRow={(row) => (
            <MobileAnalyticsCard
              href={buildBorrowerProfileHref(row.borrower, chainId)}
              title={row.borrowerName}
              titleSub={
                <Typography variant="text4" color={COLORS.santasGrey}>
                  {trimAddress(row.borrower)}
                </Typography>
              }
              headlineValue={formatUsd(row.exposure, { compact: true })}
              headlineLabel="Exposure"
              progress={{
                value: row.share,
                leftLabel: `${row.marketCount} market${
                  row.marketCount === 1 ? "" : "s"
                }`,
                label: `${formatPercent(row.share, 1)} of portfolio`,
              }}
            />
          )}
        />
      </ProfileSectionPanel>

      <ProfileSectionPanel title="Historical Borrower Exposure">
        <AnalyticsDataGrid
          loading={isLoading}
          rows={historicalBorrowerExposureRows}
          columns={borrowerExposureColumns}
          noRowsLabel="No historical borrower exposure."
          minWidth={700}
          maxHeight={isMobile ? 520 : 560}
          renderMobileRow={(row) => (
            <MobileAnalyticsCard
              href={buildBorrowerProfileHref(row.borrower, chainId)}
              title={row.borrowerName}
              titleSub={
                <Typography variant="text4" color={COLORS.santasGrey}>
                  {trimAddress(row.borrower)}
                </Typography>
              }
              headlineValue={formatUsd(row.exposure, { compact: true })}
              headlineLabel="Exposure"
              progress={{
                value: row.share,
                leftLabel: `${row.marketCount} market${
                  row.marketCount === 1 ? "" : "s"
                }`,
                label: `${formatPercent(row.share, 1)} of historical total`,
              }}
            />
          )}
        />
      </ProfileSectionPanel>
    </Box>
  )
}
