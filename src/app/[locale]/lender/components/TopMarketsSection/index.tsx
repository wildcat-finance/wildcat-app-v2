"use client"

import { useMemo, useState } from "react"
import * as React from "react"

import { Box, Button, Skeleton, Typography } from "@mui/material"
import { DataGrid, GridRenderCellParams, GridRowsProp } from "@mui/x-data-grid"
import {
  DepositStatus,
  MarketVersion,
  TokenAmount,
} from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"

import { TypeSafeColDef } from "@/app/[locale]/borrower/components/MarketsSection/сomponents/MarketsTables/interface"
import { LinkCell } from "@/app/[locale]/borrower/components/MarketsTables/style"
import { LenderOtherMarketsTableModel } from "@/app/[locale]/lender/components/MarketsSection/components/MarketsTables/OtherMarketsTables/interface"
import { TopMarketSectionSelect } from "@/app/[locale]/lender/components/TopMarketSectionSelect"
import { useLenderMarketsContext } from "@/app/[locale]/lender/context"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketTypeChip } from "@/components/@extended/MarketTypeChip"
import {
  getAdsCellProps,
  getAdsTooltipComponent,
} from "@/components/AdsBanners/adsHelpers"
import { AprChip } from "@/components/AprChip"
import { BorrowerProfileChip } from "@/components/BorrowerProfileChip"
import { MarketsTableWrapper } from "@/components/MarketsTableWrapper"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import {
  buildMarketHref,
  formatBps,
  formatSecsToHours,
  formatTokenWithCommas,
  trimAddress,
} from "@/utils/formatters"
import { getMarketStatusChip } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

const DATA_GRID_MIN_HEIGHT = "106px"

export const DataGridSx = {
  overflow: "visible",
  height: "auto !important",
  minHeight: DATA_GRID_MIN_HEIGHT,
  maxWidth: "calc(100vw - 267px)",
  padding: "0",
  "& .MuiDataGrid-main": {
    overflow: "visible",
    height: "auto !important",
    minHeight: DATA_GRID_MIN_HEIGHT,
    flex: "0 0 auto !important",
  },
  "& .MuiDataGrid-virtualScroller": {
    overflow: "visible",
    height: "auto !important",
    minHeight: "66px",
    flex: "0 0 auto !important",
  },
  "& .MuiDataGrid-virtualScrollerContent": {
    height: "auto !important",
  },
  "& .MuiDataGrid-virtualScrollerRenderZone": {
    position: "static !important" as const,
    transform: "none !important",
  },
  "& .MuiDataGrid-columnHeaders": {
    position: "sticky",
    top: 0,
    zIndex: 2,
    backgroundColor: COLORS.white,
  },
  "& .MuiDataGrid-columnHeaderTitleContainer": {
    margin: "8px 0 !important",
  },
  "& .MuiDataGrid-columnHeader": {
    padding: 0,
  },
  "& .MuiDataGrid-row": {
    minHeight: "66px !important",
    maxHeight: "66px !important",
  },
  "& .MuiDataGrid-cell": {
    padding: "0px",
    minHeight: "66px",
    height: "auto",
  },
}

const SORT_OPTIONS = [
  "Highest Yield",
  "Shortest Withdrawal Cycle",
  "Most Funded",
]

const clickableGridSx = {
  ...DataGridSx,
  "& .MuiDataGrid-row": {
    minHeight: "66px !important",
    maxHeight: "66px !important",
    cursor: "pointer",
  },
}

export const TopMarketsSection = () => {
  const { t } = useTranslation()
  const router = useRouter()
  const { marketAccounts, borrowers, isLoadingInitial, isLoadingUpdate } =
    useLenderMarketsContext()

  const [sortMode, setSortMode] = useState(SORT_OPTIONS[0])

  const isLoading = isLoadingInitial || isLoadingUpdate

  const sortedRows = useMemo((): GridRowsProp<LenderOtherMarketsTableModel> => {
    const active = marketAccounts.filter((a) => !a.market.isClosed)

    const sorted = [...active].sort((a, b) => {
      if (sortMode === "Highest Yield") {
        return b.market.annualInterestBips - a.market.annualInterestBips
      }
      if (sortMode === "Shortest Withdrawal Cycle") {
        return (
          a.market.withdrawalBatchDuration - b.market.withdrawalBatchDuration
        )
      }
      if (b.market.totalSupply.gt(a.market.totalSupply)) return 1
      if (a.market.totalSupply.gt(b.market.totalSupply)) return -1
      return 0
    })

    return sorted.slice(0, 3).map((account) => {
      const { market } = account
      const {
        address,
        name,
        borrower: borrowerAddress,
        underlyingToken,
        annualInterestBips,
        maxTotalSupply,
        totalSupply,
        withdrawalBatchDuration,
        chainId,
      } = market

      const borrower = (borrowers ?? []).find(
        (b) => b.address.toLowerCase() === borrowerAddress.toLowerCase(),
      )
      const borrowerName = borrower
        ? borrower.alias || borrower.name
        : trimAddress(borrowerAddress)

      return {
        id: address,
        status: getMarketStatusChip(market),
        term: getMarketTypeChip(market),
        name,
        borrower: borrowerName,
        borrowerAddress,
        asset: underlyingToken.symbol,
        apr: annualInterestBips,
        withdrawalBatchDuration,
        debt: totalSupply,
        capacityLeft: maxTotalSupply.sub(totalSupply),
        isSelfOnboard:
          !account.hasEverInteracted &&
          market.version === MarketVersion.V2 &&
          account.depositAvailability === DepositStatus.Ready,
        button: address,
        chainId,
      }
    })
  }, [marketAccounts, borrowers, sortMode])

  const handleRowClick = (
    params: { row: LenderOtherMarketsTableModel },
    event: { target: EventTarget | null },
  ) => {
    const target = event.target as HTMLElement
    if (target.closest("a") || target.closest("button")) return
    router.push(buildMarketHref(params.row.id, params.row.chainId))
  }

  const columns: TypeSafeColDef<LenderOtherMarketsTableModel>[] = [
    {
      field: "name",
      headerName: t("dashboard.markets.tables.header.name"),
      flex: 2.5,
      minWidth: 200,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <Box
          sx={{
            ...LinkCell,
            paddingRight: "16px",
            justifyContent: "center",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "6px",
            minWidth: 0,
          }}
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
            {params.value}
          </Typography>
          {params.row.borrowerAddress ? (
            <Link
              href={`${ROUTES.lender.profile}/${params.row.borrowerAddress}`}
              prefetch={false}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              style={{ display: "flex", textDecoration: "none" }}
            >
              <BorrowerProfileChip borrower={params.row.borrower} />
            </Link>
          ) : (
            <BorrowerProfileChip borrower={params.row.borrower} />
          )}
        </Box>
      ),
    },
    {
      field: "status",
      headerName: t("dashboard.markets.tables.header.status"),
      minWidth: 100,
      flex: 1,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <Box sx={{ ...LinkCell, justifyContent: "flex-start" }}>
          <Box width="120px">
            <MarketStatusChip status={params.value} />
          </Box>
        </Box>
      ),
    },
    {
      field: "term",
      headerName: t("dashboard.markets.tables.header.term"),
      minWidth: 100,
      flex: 1,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <Box sx={{ ...LinkCell, justifyContent: "flex-start" }}>
          <Box minWidth="170px">
            <MarketTypeChip type="table" {...params.value} />
          </Box>
        </Box>
      ),
    },
    {
      field: "apr",
      headerName: t("dashboard.markets.tables.header.apr"),
      minWidth: 100,
      flex: 1,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => {
        const adsComponent = getAdsTooltipComponent(
          params.row.id,
          formatBps(params.value),
        )
        const adsCellProps = getAdsCellProps(params.row.id)

        return (
          <Box sx={{ ...LinkCell, justifyContent: "flex-end" }}>
            <AprChip
              isBonus={!!adsCellProps}
              baseApr={formatBps(params.value)}
              icons={adsCellProps?.icons}
              adsComponent={adsComponent}
            />
          </Box>
        )
      },
    },
    {
      field: "withdrawalBatchDuration",
      headerName: t("dashboard.markets.tables.header.withdrawal"),
      minWidth: 100,
      flex: 1,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => (
        <Box sx={{ ...LinkCell, justifyContent: "flex-end" }}>
          {formatSecsToHours(params.value, true)}
        </Box>
      ),
    },
    {
      field: "asset",
      headerName: t("dashboard.markets.tables.header.asset"),
      minWidth: 112,
      flex: 0.5,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => (
        <Box sx={{ ...LinkCell, justifyContent: "flex-end" }}>
          {params.value}
        </Box>
      ),
    },
    {
      field: "capacityLeft",
      headerName: t("dashboard.markets.tables.header.capacity"),
      minWidth: 100,
      flex: 1,
      headerAlign: "right",
      align: "right",
      renderCell: (
        params: GridRenderCellParams<LenderOtherMarketsTableModel, TokenAmount>,
      ) => (
        <Box sx={{ ...LinkCell, justifyContent: "flex-end" }}>
          {params.value && params.value.gt(0)
            ? formatTokenWithCommas(params.value, {
                withSymbol: false,
                fractionDigits: 2,
              })
            : "0"}
        </Box>
      ),
    },
    {
      field: "debt",
      headerName: t("dashboard.markets.tables.header.debt"),
      minWidth: 100,
      flex: 1,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => (
        <Box sx={{ ...LinkCell, justifyContent: "flex-end" }}>
          {params.value
            ? formatTokenWithCommas(params.value, {
                withSymbol: false,
                fractionDigits: 2,
              })
            : "0"}
        </Box>
      ),
    },
    {
      sortable: false,
      field: "button",
      headerName: "",
      minWidth: 100,
      flex: 1,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => (
        <Box sx={{ ...LinkCell, justifyContent: "flex-end" }}>
          {params.row.isSelfOnboard ? (
            <Button size="small" variant="contained" color="secondary">
              {t("dashboard.markets.tables.other.depositBTN")}
            </Button>
          ) : (
            <Link
              href={`${ROUTES.lender.profile}/${params.row.borrowerAddress}`}
              prefetch={false}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              style={{ textDecoration: "none" }}
            >
              <Button size="small" variant="contained" color="secondary">
                {t("dashboard.markets.tables.other.requestBTN")}
              </Button>
            </Link>
          )}
        </Box>
      ),
    },
  ]

  return (
    <Box sx={{ width: "100%", paddingX: "16px" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        <Typography variant="title3">Top 3</Typography>
        <TopMarketSectionSelect
          options={SORT_OPTIONS}
          value={sortMode}
          onChange={setSortMode}
        />
      </Box>

      <MarketsTableWrapper
        marketsLength={sortedRows.length}
        rowsLength={3}
        isLoading={isLoading}
        noMarketsTitle="No Markets Available"
        noMarketsSubtitle="There are no markets to display at the moment."
        highlightNoMarketsBanner
      >
        <DataGrid
          disableVirtualization
          sx={clickableGridSx}
          rowHeight={66}
          rows={sortedRows}
          columns={columns}
          columnHeaderHeight={36}
          onRowClick={handleRowClick}
          hideFooter
        />
      </MarketsTableWrapper>
    </Box>
  )
}
