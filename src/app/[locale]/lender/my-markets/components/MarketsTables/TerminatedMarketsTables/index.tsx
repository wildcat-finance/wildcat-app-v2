import * as React from "react"
import { useEffect } from "react"

import { Box, Button, Typography } from "@mui/material"
import {
  DataGrid,
  GridRow,
  GridRowProps,
  GridRenderCellParams,
  GridRowsProp,
} from "@mui/x-data-grid"
import { TokenAmount } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { TypeSafeColDef } from "@/app/[locale]/borrower/components/MarketsSection/сomponents/MarketsTables/interface"
import { LinkCell } from "@/app/[locale]/borrower/components/MarketsTables/style"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { BorrowerProfileChip } from "@/components/BorrowerProfileChip"
import {
  ComposableChipCell,
  COMPOSABLE_GRID_RESIZE_THROTTLE_MS,
  ComposableExpansionProvider,
  ComposableRowPanel,
} from "@/components/Destinations"
import { MarketsTableAccordion } from "@/components/MarketsTableAccordion"
import { MobileMarketList } from "@/components/Mobile/MobileMarketList"
import { TablePagination } from "@/components/TablePagination"
import { TotalDebtHeader } from "@/components/TotalDebtHeader"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { ROUTES } from "@/routes"
import { useAppSelector } from "@/store/hooks"
import { COLORS } from "@/theme/colors"
import { statusComparator, tokenAmountComparator } from "@/utils/comparators"
import { getGridMinWidth } from "@/utils/dataGrid"
import {
  buildMarketHref,
  formatSecsToHours,
  formatTokenWithCommas,
  trimAddress,
} from "@/utils/formatters"
import { getMarketTotalDebt } from "@/utils/marketDebt"
import { getMarketStatusChip } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

import {
  TerminatedMarketsTableModel,
  TerminatedMarketsTableProps,
} from "./interface"
import { DATA_GRID_SIDE_PADDING, DataGridSx } from "../style"

const MarketLinkRow = (props: GridRowProps) => (
  <>
    <Link
      href={buildMarketHref(props.row.id, props.row.chainId)}
      style={{ display: "contents", color: "inherit" }}
      tabIndex={-1}
    >
      <GridRow {...props} />
    </Link>
    <ComposableRowPanel
      rowId={props.row.id}
      marketSymbol={props.row.marketTokenSymbol}
      aprBips={props.row.apr}
      dividerBelow
    />
  </>
)

const clickableGridSx = {
  ...DataGridSx,
  "& .MuiDataGrid-row": {
    minHeight: "66px !important",
    maxHeight: "66px !important",
    cursor: "pointer",
  },
}

export const TerminatedMarketsTables = ({
  marketAccounts,
  borrowers,
  isLoading,
  destinations,
  composableOnly,
  filters,
}: TerminatedMarketsTableProps) => {
  const isMobile = useMobileResolution()
  const { t } = useTranslation()
  const { markets: destinationsByMarket } = destinations
  const scrollTargetId = useAppSelector(
    (state) => state.lenderDashboard.scrollTarget,
  )

  const [paginationModel, setPaginationModel] = React.useState({
    pageSize: 50,
    page: 0,
  })

  const { assetFilter, statusFilter, nameFilter, withdrawalCycleFilter } =
    filters

  useEffect(() => {
    setPaginationModel((prevState) => ({ ...prevState, page: 0 }))
  }, [
    assetFilter,
    statusFilter,
    nameFilter,
    withdrawalCycleFilter,
    composableOnly,
  ])

  const rows: GridRowsProp<TerminatedMarketsTableModel> = marketAccounts.map(
    (account) => {
      const { market, marketBalance } = account
      const {
        address,
        borrower: borrowerAddress,
        name,
        underlyingToken,
        marketToken,
        annualInterestBips,
        maxTotalSupply,
        withdrawalBatchDuration,
        chainId,
      } = market

      const borrower = borrowers?.find(
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
        loan: marketBalance,
        debt: getMarketTotalDebt(market),
        capacity: maxTotalSupply,
        hasEverInteracted: account.hasEverInteracted,
        chainId,
        destinationsCount:
          destinationsByMarket[address.toLowerCase()]?.length ?? 0,
        marketTokenSymbol: marketToken.symbol,
      }
    },
  )

  const prevActive = rows.filter((market) => market.hasEverInteracted)
  const neverActive = rows.filter((market) => !market.hasEverInteracted)

  const terminatedRows = [...prevActive, ...neverActive]

  const showComposableColumn = destinations.showDestinations

  const columns: TypeSafeColDef<TerminatedMarketsTableModel>[] = [
    {
      field: "name",
      headerName: t("dashboard.markets.tables.header.name"),
      flex: 2,
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
            borderLeft: params.row.loan.gt(0)
              ? `2px solid ${COLORS.carminePink}`
              : "none",
            paddingLeft: params.row.loan.gt(0) ? "10px" : 0,
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
      sortComparator: statusComparator,
      renderCell: (params) => (
        <Box sx={{ ...LinkCell, justifyContent: "flex-start" }}>
          <Box width="120px">
            <MarketStatusChip status={params.value} />
          </Box>
        </Box>
      ),
    },
    {
      field: "asset",
      headerName: t("dashboard.markets.tables.header.asset"),
      minWidth: 200,
      flex: 2,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => (
        <Box sx={{ ...LinkCell, justifyContent: "flex-end" }}>
          {params.value}
        </Box>
      ),
    },
    {
      field: "debt",
      headerName: t("dashboard.markets.tables.header.debt"),
      renderHeader: () => (
        <TotalDebtHeader label={t("dashboard.markets.tables.header.debt")} />
      ),
      minWidth: 100,
      flex: 1,
      headerAlign: "right",
      align: "right",
      sortComparator: tokenAmountComparator,
      renderCell: (params) => (
        <Box sx={{ ...LinkCell, justifyContent: "flex-end" }}>
          {params.value
            ? formatTokenWithCommas(params.value, {
                withSymbol: false,
                fractionDigits: 2,
                compact: true,
              })
            : "0"}
        </Box>
      ),
    },
    {
      field: "loan",
      headerName: t("dashboard.markets.tables.header.loan"),
      minWidth: 100,
      flex: 1,
      headerAlign: "right",
      align: "right",
      sortComparator: tokenAmountComparator,
      renderCell: (
        params: GridRenderCellParams<TerminatedMarketsTableModel, TokenAmount>,
      ) => (
        <Box sx={{ ...LinkCell, justifyContent: "flex-end" }}>
          {params.value
            ? formatTokenWithCommas(params.value, {
                withSymbol: false,
                fractionDigits: 2,
                compact: true,
              })
            : "0"}
        </Box>
      ),
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
    ...(showComposableColumn
      ? [
          {
            field: "destinationsCount",
            headerName: t("destinations.column"),
            minWidth: 128,
            flex: 1,
            headerAlign: "right",
            align: "right",
            sortable: true,
            renderCell: (
              params: GridRenderCellParams<TerminatedMarketsTableModel, number>,
            ) => (
              <ComposableChipCell
                rowId={params.row.id}
                count={params.row.destinationsCount}
              />
            ),
          } satisfies TypeSafeColDef<TerminatedMarketsTableModel>,
        ]
      : []),
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
          <Button
            size="small"
            variant="contained"
            color="secondary"
            disabled={!params.row.hasEverInteracted}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            Withdraw
          </Button>
        </Box>
      ),
    },
  ]

  const gridMinWidth = getGridMinWidth(columns, 2 * DATA_GRID_SIDE_PADDING)

  if (isMobile)
    return (
      <>
        {scrollTargetId === "prev-active" && (
          <MobileMarketList markets={prevActive} isLoading={isLoading} />
        )}
        {scrollTargetId === "never-active" && (
          <MobileMarketList markets={neverActive} isLoading={isLoading} />
        )}
      </>
    )

  return (
    <ComposableExpansionProvider destinations={destinations}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "calc(100vh - 250px)",
          width: "100%",
          overflow: "auto",
          overflowY: "auto",
          marginTop: "16px",
          paddingBottom: "26px",
        }}
      >
        <MarketsTableAccordion
          hideSummary
          minContentWidth={gridMinWidth}
          label={t("dashboard.markets.tables.other.terminated")}
          marketsLength={terminatedRows.length}
          isLoading={isLoading}
          isOpen
          nameFilter={filters.nameFilter}
          assetFilter={filters.assetFilter}
          statusFilter={filters.statusFilter}
          showNoFilteredMarkets
          noMarketsTitle={
            composableOnly
              ? t("destinations.noComposableMarkets")
              : t("dashboard.markets.noMarkets.closed.title")
          }
          noMarketsSubtitle={
            composableOnly
              ? undefined
              : t("dashboard.markets.noMarkets.closed.subtitle")
          }
        >
          <DataGrid
            disableVirtualization
            sx={clickableGridSx}
            rowHeight={66}
            resizeThrottleMs={COMPOSABLE_GRID_RESIZE_THROTTLE_MS}
            rows={terminatedRows}
            columns={columns}
            columnHeaderHeight={40}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[50]}
            slots={{
              row: MarketLinkRow,
              pagination: TablePagination,
            }}
            hideFooter={false}
          />
        </MarketsTableAccordion>
      </Box>
    </ComposableExpansionProvider>
  )
}
