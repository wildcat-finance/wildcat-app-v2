"use client"

import * as React from "react"

import { Box, Button, Chip, SvgIcon, Tooltip, Typography } from "@mui/material"
import { GridColDef } from "@mui/x-data-grid"
import { HooksKind } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"

import {
  getBorrowerDisplayName,
  useBorrowerNames,
} from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import {
  LenderPositionRow,
  LenderPositionsData,
} from "@/app/[locale]/lender/profile/hooks/types"
import { useLenderInterestBreakdown } from "@/app/[locale]/lender/profile/hooks/useLenderInterestBreakdown"
import Check from "@/assets/icons/check_icon.svg"
import Cross from "@/assets/icons/cross_icon.svg"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketTypeChip } from "@/components/@extended/MarketTypeChip"
import {
  getAdsCellProps,
  getAdsTooltipComponent,
} from "@/components/AdsBanners/adsHelpers"
import { AprChip } from "@/components/AprChip"
import { LinkGroup } from "@/components/LinkComponent"
import { MobileAnalyticsCard } from "@/components/Mobile/MobileAnalyticsCard"
import {
  formatDate,
  formatPercent,
  formatUsd,
} from "@/components/Profile/shared/analytics"
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

const CONCENTRATION_THRESHOLD = 50
const CONCENTRATION_COPY =
  "Position size above 50% of portfolio in a single borrower is flagged as concentration risk."

const POSITION_STATUS_ORDER: LenderPositionRow["status"][] = [
  "Active",
  "Closed",
  "Delinquent",
  "Penalty",
]

const STATUS_CHIP_LABEL: Record<LenderPositionRow["status"], string> = {
  Active: "Active",
  Closed: "Closed",
  Delinquent: "Pending",
  Penalty: "Delinquent",
}

const BORROWER_DOT_COLORS = [
  COLORS.ultramarineBlue,
  COLORS.butteredRum,
  COLORS.blackRock,
  COLORS.santasGrey,
]

const borrowerDotColor = (address: string) => {
  let hash = 0
  for (let index = 0; index < address.length; index += 1) {
    hash = (hash * 31 + address.charCodeAt(index)) % 1_000_000
  }
  return BORROWER_DOT_COLORS[Math.abs(hash) % BORROWER_DOT_COLORS.length]
}

const STATUS_ICON_COLOR: Record<LenderPositionRow["status"], string> = {
  Active: COLORS.ultramarineBlue,
  Closed: COLORS.greySuit,
  Delinquent: COLORS.galliano,
  Penalty: COLORS.galliano,
}

const PortfolioHealthChip = ({
  status,
  label,
  count,
  selected,
  onClick,
}: {
  status: LenderPositionRow["status"]
  label: string
  count: number
  selected: boolean
  onClick: () => void
}) => (
  <Box
    component="button"
    type="button"
    onClick={onClick}
    sx={{
      display: "flex",
      alignItems: "center",
      gap: "4px",
      height: "28px",
      padding: "6px 12px",
      margin: 0,
      borderRadius: "24px",
      backgroundColor: "transparent",
      cursor: "pointer",
      appearance: "none",
      border: `1px solid ${selected ? COLORS.manate : COLORS.whiteLilac}`,
      "&:hover": { borderColor: COLORS.manate },
    }}
  >
    <Box
      sx={{
        height: "10px",
        width: "10px",
        borderRadius: "50%",
        border: `1px solid ${STATUS_ICON_COLOR[status]}`,

        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {status === "Active" && (
        <SvgIcon
          sx={{
            fontSize: "6px",
            "& path": { fill: STATUS_ICON_COLOR[status] },
          }}
        >
          <Check />
        </SvgIcon>
      )}

      {status === "Closed" && (
        <SvgIcon
          sx={{
            fontSize: "6px",
            "& path": { fill: STATUS_ICON_COLOR[status] },
          }}
        >
          <Cross />
        </SvgIcon>
      )}

      {status === "Penalty" && (
        <Typography
          color={COLORS.galliano}
          sx={{ fontSize: "6px", fontWeight: 600, lineHeight: "6px" }}
        >
          !
        </Typography>
      )}
    </Box>

    <Typography
      variant="text4"
      color={COLORS.blackRock}
      sx={{ fontWeight: 600 }}
    >
      {label}
    </Typography>

    <Typography variant="text4" color={COLORS.santasGrey}>
      {count}
    </Typography>
  </Box>
)

const TermCell = ({
  termEndTime,
  isMobile,
}: {
  termEndTime: number
  isMobile: boolean
}) => {
  const isFixedTerm = termEndTime > 0
  return (
    <MarketTypeChip
      type="table"
      kind={isFixedTerm ? HooksKind.FixedTerm : HooksKind.OpenTerm}
      fixedPeriod={isFixedTerm ? termEndTime * 1000 - Date.now() : undefined}
      isMobile={isMobile}
    />
  )
}

const InterestCell = ({
  value,
  inHandUsd,
}: {
  value: number
  inHandUsd: number
}) => (
  <Box sx={{ width: "100%", textAlign: "right" }}>
    <Typography variant="text3" display="block">
      {formatUsd(value, { compact: true })}
    </Typography>
    {inHandUsd > 0 && (
      <Typography variant="text4" color={COLORS.santasGrey} display="block">
        {formatUsd(inHandUsd, { compact: true })} in hand
      </Typography>
    )}
  </Box>
)

const ConcentrationCell = ({ share }: { share: number }) => {
  const flagged = share > CONCENTRATION_THRESHOLD
  const barColor = flagged ? COLORS.butteredRum : COLORS.ultramarineBlue
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: "8px",
        width: "100%",
      }}
    >
      <Box
        sx={{
          flex: "1 1 auto",
          minWidth: "60px",
          maxWidth: "160px",
          height: "6px",
          borderRadius: "3px",
          backgroundColor: COLORS.athensGrey,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            width: `${Math.min(100, Math.max(0, share))}%`,
            height: "100%",
            backgroundColor: barColor,
          }}
        />
      </Box>
      <Typography
        variant="text3"
        color={flagged ? COLORS.butteredRum : undefined}
      >
        {formatPercent(share, 1)}
      </Typography>
      {flagged && (
        <Tooltip title={CONCENTRATION_COPY} placement="top" arrow>
          <Box
            component="span"
            sx={{
              flexShrink: 0,
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              backgroundColor: COLORS.butteredRum,
              color: COLORS.white,
              fontSize: "10px",
              lineHeight: "14px",
              textAlign: "center",
              fontWeight: 600,
            }}
          >
            !
          </Box>
        </Tooltip>
      )}
    </Box>
  )
}

export const LenderOverviewTab = ({
  lenderAddress,
  data,
  isLoading,
}: LenderOverviewTabProps) => {
  const { data: borrowers } = useBorrowerNames()
  const isMobile = useMobileResolution()
  const { chainId } = useSelectedNetwork()
  const { getAddressUrl } = useBlockExplorer()
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

  const interestBreakdown = useLenderInterestBreakdown({
    lenderAddress,
    marketIds: data?.marketIds ?? [],
    priceMap: data?.priceMap ?? {},
    decimalsMap: data?.decimalsMap ?? {},
  })
  const interestByMarket = interestBreakdown.data?.byMarket ?? {}

  const [statusFilter, setStatusFilter] = React.useState<
    LenderPositionRow["status"] | null
  >(null)

  const statusCounts = React.useMemo(
    () =>
      POSITION_STATUS_ORDER.map((status) => ({
        status,
        label: STATUS_CHIP_LABEL[status],
        count: positionsWithBorrowerNames.filter(
          (position) => position.status === status,
        ).length,
      })).filter((entry) => entry.count > 0),
    [positionsWithBorrowerNames],
  )

  const healthPositions = React.useMemo(
    () =>
      [...positionsWithBorrowerNames]
        .filter((position) =>
          statusFilter ? position.status === statusFilter : true,
        )
        .sort((left, right) => right.currentBalance - left.currentBalance),
    [positionsWithBorrowerNames, statusFilter],
  )

  const totalPositions =
    data?.profile.totalPositions ?? positionsWithBorrowerNames.length
  const activeCount = data?.profile.activePositions ?? activePositions.length
  const healthSubtitle = `${totalPositions} position${
    totalPositions === 1 ? "" : "s"
  } total · ${activeCount} active`

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

  const positionColumns: GridColDef[] = [
    {
      field: "marketName",
      headerName: "Market",
      flex: 1.6,
      minWidth: 240,
      renderCell: ({ row, value }) => (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            py: "8px",
            minWidth: 0,
          }}
        >
          <Link
            href={buildMarketHref(
              row.marketId,
              undefined,
              ROUTES.lender.market,
            )}
          >
            <Typography
              component="span"
              variant="text3"
              color={COLORS.blackRock}
            >
              {value}
            </Typography>
          </Link>
          <Box sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Box
              sx={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                flexShrink: 0,
                backgroundColor: borrowerDotColor(row.borrower),
              }}
            />
            <Typography variant="text4" color={COLORS.santasGrey} noWrap>
              {row.borrowerDisplayName || row.borrowerName}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: "status",
      headerName: "Status and Term",
      flex: 1,
      minWidth: 160,
      renderCell: ({ row }) => (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "4px",
            py: "8px",
          }}
        >
          <MarketStatusChip
            status={getPositionMarketStatus(row.status)}
            withPeriod={false}
          />
          <TermCell termEndTime={row.termEndTime} isMobile={isMobile} />
        </Box>
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
      minWidth: 120,
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
      minWidth: 120,
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
      headerName: "Interest earned",
      minWidth: 140,
      align: "right",
      headerAlign: "right",
      renderCell: ({ row, value }) => (
        <InterestCell
          value={value as number}
          inHandUsd={interestByMarket[row.marketId]?.inHandUsd ?? 0}
        />
      ),
    },
    {
      field: "apr",
      headerName: "APR",
      minWidth: 120,
      align: "right",
      headerAlign: "right",
      renderCell: ({ row, value }) => {
        const ads = getAdsCellProps(row.marketId)
        return (
          <Box
            sx={{ display: "flex", justifyContent: "flex-end", width: "100%" }}
          >
            <AprChip
              baseApr={(value as number).toFixed(2)}
              isBonus={!!ads}
              icons={ads?.icons}
              adsComponent={getAdsTooltipComponent(
                row.marketId,
                `${(value as number).toFixed(2)}%`,
              )}
            />
          </Box>
        )
      },
    },
    {
      field: "deposit",
      headerName: "",
      minWidth: 130,
      sortable: false,
      align: "right",
      headerAlign: "right",
      renderCell: ({ row }) => (
        <Link
          href={buildMarketHref(row.marketId, undefined, ROUTES.lender.market)}
          style={{ textDecoration: "none" }}
        >
          <Button
            size="small"
            sx={{
              minWidth: 0,
              padding: "4px 12px",
              borderRadius: "8px",
              backgroundColor: COLORS.whiteSmoke,
              color: COLORS.blackRock,
              "&:hover": { backgroundColor: COLORS.athensGrey },
            }}
          >
            <Typography variant="text3">Deposit →</Typography>
          </Button>
        </Link>
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
      headerName: "Portfolio share",
      minWidth: 240,
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => <ConcentrationCell share={value as number} />,
    },
  ]

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        // gap: { xs: "2px", md: "24px" },
      }}
    >
      <Typography variant="title3" sx={{ mb: { xs: "2px", md: "24px" } }}>
        Overview
      </Typography>

      <LenderOverviewHeader lenderAddress={lenderAddress} data={data} />

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          mb: { xs: "2px", md: "24px" },
          mt: { xs: "2px", md: "36px" },
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <Typography variant="title3">Portfolio health</Typography>

          <Typography variant="text2" sx={{ opacity: 0.7 }}>
            {healthSubtitle}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {statusCounts.map(({ status, label, count }) => (
            <PortfolioHealthChip
              key={status}
              status={status}
              label={label}
              count={count}
              selected={statusFilter === status}
              onClick={() =>
                setStatusFilter((prev) => (prev === status ? null : status))
              }
            />
          ))}
        </Box>
      </Box>

      <ProfileSectionPanel
        title="Portfolio health"
        subtitle={healthSubtitle}
        actions={
          statusCounts.length > 0 ? (
            <Box sx={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {statusCounts.map(({ status, label, count }) => {
                const selected = statusFilter === status
                return (
                  <Chip
                    key={status}
                    label={`${label} ${count}`}
                    onClick={() =>
                      setStatusFilter((prev) =>
                        prev === status ? null : status,
                      )
                    }
                    sx={{
                      height: "28px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      backgroundColor: COLORS.white,
                      color: selected ? COLORS.blackRock : COLORS.santasGrey,
                      border: `1px solid ${
                        selected ? COLORS.blackRock : COLORS.athensGrey
                      }`,
                      fontWeight: 500,
                      "&:hover": { backgroundColor: COLORS.whiteSmoke },
                    }}
                  />
                )
              })}
            </Box>
          ) : undefined
        }
      >
        <AnalyticsDataGrid
          loading={isLoading}
          rows={healthPositions}
          columns={positionColumns}
          noRowsLabel="No positions for this lender."
          minWidth={1120}
          maxHeight={isMobile ? 520 : 560}
          renderMobileRow={(row) => {
            const inHand = interestByMarket[row.marketId]?.inHandUsd ?? 0
            return (
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
                  ...(inHand > 0
                    ? [
                        {
                          label: "In hand",
                          value: formatUsd(inHand, { compact: true }),
                        },
                      ]
                    : []),
                  { label: "APR", value: formatPercent(row.apr) },
                  {
                    label: "Term",
                    value:
                      row.termEndTime > 0
                        ? formatDate(row.termEndTime)
                        : "Open term",
                  },
                ]}
              />
            )
          }}
        />
      </ProfileSectionPanel>

      <ProfileSectionPanel
        title="Borrower exposure"
        subtitle={CONCENTRATION_COPY}
      >
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
                color:
                  row.share > CONCENTRATION_THRESHOLD
                    ? COLORS.butteredRum
                    : undefined,
                leftLabel: `${row.marketCount} market${
                  row.marketCount === 1 ? "" : "s"
                }`,
                label: `${formatPercent(row.share, 1)} of portfolio`,
              }}
            />
          )}
        />
      </ProfileSectionPanel>
    </Box>
  )
}
