import * as React from "react"

import { Box, Button, Tooltip, Typography } from "@mui/material"
import { DataGrid, GridRowsProp } from "@mui/x-data-grid"
import Link from "next/link"

import {
  getBorrowerDisplayName,
  useBorrowerNames,
} from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import {
  ProfileHealthClickableGridSx,
  ProfileHealthLinkCell,
  ProfileHealthRowLinkInteractiveSx,
  ProfileHealthRowLinkStretchedSx,
} from "@/app/[locale]/lender/profile/components/LenderProfileOverviewTab/ProfileHealthTable/style"
import { useLenderInterestBreakdown } from "@/app/[locale]/lender/profile/hooks/useLenderInterestBreakdown"
import { BorrowerProfileChip } from "@/components/BorrowerProfileChip"
import { formatPercent, formatUsd } from "@/components/Profile/shared/analytics"
import { TablePagination } from "@/components/TablePagination"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { buildBorrowerProfileHref, buildMarketHref } from "@/utils/formatters"

import {
  CONCENTRATION_COPY,
  CONCENTRATION_THRESHOLD,
  MarketYieldRow,
  MarketYieldTableProps,
  TypeSafeColDef,
} from "./interface"

// Shared mini-bar geometry. A fixed width (not flex) is what keeps every row's
// bar identical and aligned — graphic data lives in its own column, separate
// from the numbers, so neither floats with the other's content width.
const MINI_BAR_HEIGHT = "4px"

// Graphic half of "Base / penalty": grey (base) + red (penalty) proportional
// bar. Fixed width, right-aligned so it sits flush before the numbers column.
const BasePenaltyBar = ({
  baseUsd,
  penaltyUsd,
}: {
  baseUsd: number
  penaltyUsd: number
}) => {
  const total = baseUsd + penaltyUsd
  const penaltyPct = total > 0 ? (penaltyUsd / total) * 100 : 0

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "flex-end",
        width: "100%",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: "50%",
          height: MINI_BAR_HEIGHT,
          borderRadius: "3px",
          backgroundColor: COLORS.wildWatermelon,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            width: `${100 - penaltyPct}%`,
            height: "100%",
            backgroundColor: COLORS.athensGrey,
          }}
        />
        <Box
          sx={{
            width: `${penaltyPct}%`,
            height: "100%",
            backgroundColor: COLORS.wildWatermelon,
          }}
        />
      </Box>
    </Box>
  )
}

// Numeric half of "Base / penalty": "$base / $penalty", left-aligned so it sits
// directly after the bar.
const BasePenaltyValue = ({
  baseUsd,
  penaltyUsd,
}: {
  baseUsd: number
  penaltyUsd: number
}) => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "flex-end",
      width: "fit-content",
    }}
  >
    <Typography variant="text3" noWrap>
      {formatUsd(baseUsd, { compact: true })} /{" "}
      {formatUsd(penaltyUsd, { compact: true })}
    </Typography>
  </Box>
)

// Graphic half of "Share": a single proportional bar, amber once the market
// crosses the concentration-risk threshold.
const ShareBar = ({ share }: { share: number }) => {
  const flagged = share > CONCENTRATION_THRESHOLD
  const barColor = flagged ? COLORS.lemonPie : COLORS.ultramarineBlue

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "flex-end",
        width: "100%",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: "50%",
          height: MINI_BAR_HEIGHT,
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
    </Box>
  )
}

// Numeric half of "Share": the %, with a fixed-width badge slot so the number
// never shifts between flagged and unflagged rows.
const ShareValue = ({ share }: { share: number }) => {
  const flagged = share > CONCENTRATION_THRESHOLD

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: "7px",
        width: "100%",
      }}
    >
      <Typography variant="text3">{formatPercent(share, 1)}</Typography>

      <Box
        sx={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {flagged && (
          <Tooltip title={CONCENTRATION_COPY} placement="top" arrow>
            <Box
              component="span"
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                border: `1px solid ${COLORS.lemonPie}`,
                color: COLORS.lemonPie,
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
    </Box>
  )
}

export const MarketYieldTable = ({
  lenderAddress,
  lenderData,
}: MarketYieldTableProps) => {
  const { data: borrowers } = useBorrowerNames()
  const { chainId } = useSelectedNetwork()
  const [paginationModel, setPaginationModel] = React.useState({
    pageSize: 10,
    page: 0,
  })
  const { data: interestBreakdown } = useLenderInterestBreakdown({
    lenderAddress,
    marketIds: lenderData?.marketIds ?? [],
    priceMap: lenderData?.priceMap ?? {},
    decimalsMap: lenderData?.decimalsMap ?? {},
  })

  const interestByMarket = interestBreakdown?.byMarket ?? {}

  // One row per market, with base/penalty split from the interest breakdown and
  // the market's share of the lender's current portfolio.
  const rows = React.useMemo<GridRowsProp<MarketYieldRow>>(() => {
    const positions = lenderData?.positions ?? []
    const totalBalance = positions.reduce(
      (sum, position) => sum + position.currentBalance,
      0,
    )

    return positions
      .map((position) => {
        const breakdown = interestByMarket[position.marketId]
        const share =
          totalBalance > 0 ? (position.currentBalance / totalBalance) * 100 : 0

        return {
          id: position.marketId,
          marketId: position.marketId,
          name: position.marketName,
          borrower: position.borrower,
          borrowerName: getBorrowerDisplayName(
            position.borrower,
            borrowers ?? [],
            "name",
          ),
          interest: breakdown?.totalInterestUsd ?? position.interestEarned,
          baseUsd: breakdown?.baseUsd ?? 0,
          penaltyUsd: breakdown?.penaltyUsd ?? 0,
          share,
          shareBar: share,
          button: position.marketId,
        }
      })
      .sort((left, right) => right.interest - left.interest)
  }, [lenderData?.positions, borrowers, interestByMarket])

  const columns: TypeSafeColDef<MarketYieldRow>[] = [
    {
      field: "name",
      headerName: "Market",
      flex: 1.5,
      minWidth: 200,
      headerAlign: "left",
      align: "left",
      renderCell: ({ row }) => (
        <Box
          sx={{
            ...ProfileHealthLinkCell,
            justifyContent: "center",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "6px",
            minWidth: 0,
          }}
        >
          <Box
            component={Link}
            href={buildMarketHref(
              row.marketId,
              undefined,
              ROUTES.lender.market,
            )}
            sx={ProfileHealthRowLinkStretchedSx}
          >
            <Typography
              variant="text3"
              sx={{
                display: "block",
                width: "100%",
                minWidth: 0,
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            >
              {row.name}
            </Typography>
          </Box>

          {row.borrower ? (
            <Box
              component={Link}
              href={buildBorrowerProfileHref(row.borrower, chainId)}
              prefetch={false}
              sx={{
                ...ProfileHealthRowLinkInteractiveSx,
                display: "flex",
                textDecoration: "none",
              }}
            >
              <BorrowerProfileChip
                borrower={row.borrowerName ?? row.borrower}
              />
            </Box>
          ) : (
            <BorrowerProfileChip borrower={row.borrowerName ?? row.borrower} />
          )}
        </Box>
      ),
    },
    {
      field: "interest",
      headerName: "Interest earned",
      minWidth: 130,
      flex: 3,
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => (
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            width: "100%",
          }}
        >
          <Typography variant="text3" noWrap>
            {formatUsd(value as number, { compact: true })}
          </Typography>
        </Box>
      ),
    },
    {
      // Graphic column for base/penalty — render-only, no header, not sortable.
      field: "penaltyUsd",
      headerName: "",
      minWidth: 120,
      flex: 2,
      align: "right",
      headerAlign: "right",
      sortable: false,
      renderCell: ({ row }) => (
        <BasePenaltyBar baseUsd={row.baseUsd} penaltyUsd={row.penaltyUsd} />
      ),
    },
    {
      // Numeric column for base/penalty — carries the header, sorts by base.
      // Left-aligned so the numbers sit right after the bar.
      field: "baseUsd",
      headerName: "Base / penalty",
      minWidth: 120,
      flex: 0.1,
      align: "right",
      headerAlign: "right",
      renderCell: ({ row }) => (
        <BasePenaltyValue baseUsd={row.baseUsd} penaltyUsd={row.penaltyUsd} />
      ),
    },
    {
      // Graphic column for share — render-only, no header, not sortable.
      field: "shareBar",
      headerName: "",
      minWidth: 120,
      flex: 2,
      align: "right",
      headerAlign: "right",
      sortable: false,
      renderCell: ({ value }) => <ShareBar share={value as number} />,
    },
    {
      // Numeric column for share — carries the header, sorts by %.
      // Left-aligned so the % sits right after the bar.
      field: "share",
      headerName: "Share",
      minWidth: 70,
      flex: 0.1,
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => <ShareValue share={value as number} />,
    },
    {
      field: "button",
      headerName: "",
      minWidth: 140,
      flex: 0.5,
      sortable: false,
      align: "right",
      headerAlign: "right",
      renderCell: ({ row }) => (
        <Button
          variant="contained"
          color="secondary"
          size="small"
          component={Link}
          href={buildMarketHref(row.marketId, undefined, ROUTES.lender.market)}
          sx={{
            ...ProfileHealthRowLinkInteractiveSx,
            display: "flex",
            textDecoration: "none",
          }}
        >
          Deploy
        </Button>
      ),
    },
  ]

  return (
    <DataGrid
      disableVirtualization
      sx={ProfileHealthClickableGridSx}
      rowHeight={66}
      rows={rows}
      columns={columns}
      columnHeaderHeight={40}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      slots={{ pagination: TablePagination }}
      hideFooter={false}
    />
  )
}
