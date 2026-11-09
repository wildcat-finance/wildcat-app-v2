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
import { useLenderMarketsContext } from "@/app/[locale]/lender/context"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketTypeChip } from "@/components/@extended/MarketTypeChip"
import {
  getAdsCellProps,
  getAdsTooltipComponent,
} from "@/components/AdsBanners/adsHelpers"
import { AprChip } from "@/components/AprChip"
import { BorrowerProfileChip } from "@/components/BorrowerProfileChip"
import { DefaultedPositionsHeading } from "@/components/DefaultedPositionsHeading"
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
import { EXTERNAL_LINKS } from "@/constants/external-links"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { ROUTES } from "@/routes"
import { LenderMyMarketsTab } from "@/store/slices/lenderDashboardSlice/lenderDashboardSlice"
import {
  statusComparator,
  tokenAmountComparator,
  typeComparator,
} from "@/utils/comparators"
import { getGridMinWidth } from "@/utils/dataGrid"
import {
  buildMarketHref,
  formatBps,
  formatSecsToHours,
  formatTokenWithCommas,
  trimAddress,
} from "@/utils/formatters"
import { getMarketTotalDebt } from "@/utils/marketDebt"
import { getMarketStatusChip } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

import { ActiveMarketsTableModel, ActiveMarketsTableProps } from "./interface"
import { DATA_GRID_SIDE_PADDING, DataGridSx } from "../style"

const ACTION_COLUMN_WIDTH = 89

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

export const ActiveMarketsTables = ({
  tab,
  marketAccounts,
  borrowers,
  isLoading,
  destinations,
  composableOnly,
  filters,
  mobileHeader,
}: ActiveMarketsTableProps) => {
  const isMobile = useMobileResolution()
  const { t } = useTranslation()
  const { markets: destinationsByMarket } = destinations
  const {
    defaults: {
      isDefaulted,
      defaultedMarketsOfBorrower,
      isError: isDefaultsError,
    },
  } = useLenderMarketsContext()
  const isDefaultedTab = tab === LenderMyMarketsTab.DEFAULTED

  const [paginationModel, setPaginationModel] = React.useState({
    pageSize: 50,
    page: 0,
  })

  const { assetFilter, statusFilter, nameFilter, withdrawalCycleFilter } =
    filters

  useEffect(() => {
    setPaginationModel((prevState) => ({ ...prevState, page: 0 }))
  }, [
    tab,
    assetFilter,
    statusFilter,
    nameFilter,
    withdrawalCycleFilter,
    composableOnly,
  ])

  const rows: GridRowsProp<ActiveMarketsTableModel> = marketAccounts.map(
    (account) => {
      const { market, marketBalance, hasEverInteracted } = account
      const {
        address,
        borrower: borrowerAddress,
        name,
        underlyingToken,
        marketToken,
        annualInterestBips,
        maxTotalSupply,
        totalSupply,
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
        status: getMarketStatusChip(market, isDefaulted(address)),
        term: getMarketTypeChip(market),
        name,
        borrower: borrowerName,
        borrowerAddress,
        borrowerDefaultedCount:
          defaultedMarketsOfBorrower(borrowerAddress).length,
        asset: underlyingToken.symbol,
        apr: annualInterestBips,
        withdrawalBatchDuration,
        loan: marketBalance,
        debt: getMarketTotalDebt(market),
        capacity: maxTotalSupply,
        capacityLeft: maxTotalSupply.sub(totalSupply),
        hasEverInteracted,
        chainId,
        destinationsCount:
          destinationsByMarket[address.toLowerCase()]?.length ?? 0,
        marketTokenSymbol: marketToken.symbol,
      }
    },
  )

  const depositedMarkets = rows.filter((market) => market.hasEverInteracted)
  const nonDepositedMarkets = rows.filter((market) => !market.hasEverInteracted)

  let tabRows = depositedMarkets
  let tabLabel = t("dashboard.markets.tables.borrower.active.deposited")
  if (tab === LenderMyMarketsTab.NON_DEPOSITED) {
    tabRows = nonDepositedMarkets
    tabLabel = t("dashboard.markets.tables.borrower.active.nonDeposited")
  } else if (isDefaultedTab) {
    tabRows = [...rows]
    tabLabel = t("defaultedMarkets.tab")
  }

  const showComposableColumn = destinations.showDestinations && !isDefaultedTab

  const actionColumnWidth = isDefaultedTab ? 135 : ACTION_COLUMN_WIDTH

  const allColumns: TypeSafeColDef<ActiveMarketsTableModel>[] = [
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
              <BorrowerProfileChip
                borrower={params.row.borrower}
                defaultedMarketsCount={params.row.borrowerDefaultedCount}
              />
            </Link>
          ) : (
            <BorrowerProfileChip
              borrower={params.row.borrower}
              defaultedMarketsCount={params.row.borrowerDefaultedCount}
            />
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
      field: "term",
      headerName: t("dashboard.markets.tables.header.term"),
      minWidth: 100,
      flex: 1,
      headerAlign: "left",
      align: "left",
      sortComparator: typeComparator,
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
          params.row.chainId,
          params.row.id,
          formatBps(params.value),
        )
        const adsCellProps = getAdsCellProps(params.row.chainId, params.row.id)

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
      minWidth: 100,
      flex: 1,
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
      sortComparator: tokenAmountComparator,
      renderCell: (
        params: GridRenderCellParams<ActiveMarketsTableModel, TokenAmount>,
      ) => (
        <Box sx={{ ...LinkCell, justifyContent: "flex-end" }}>
          {params.value && params.value.gt(0)
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
        params: GridRenderCellParams<ActiveMarketsTableModel, TokenAmount>,
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
              params: GridRenderCellParams<ActiveMarketsTableModel, number>,
            ) => (
              <ComposableChipCell
                rowId={params.row.id}
                count={params.row.destinationsCount}
              />
            ),
          } satisfies TypeSafeColDef<ActiveMarketsTableModel>,
        ]
      : []),
    {
      sortable: false,
      field: "button",
      headerName: "",
      ...(isDefaultedTab || showComposableColumn
        ? { width: actionColumnWidth }
        : { minWidth: 100, flex: 1 }),
      headerAlign: "right",
      align: "right",
      renderCell: () => (
        <Box sx={{ ...LinkCell, justifyContent: "flex-end" }}>
          {isDefaultedTab ? (
            <Button
              size="small"
              variant="contained"
              color="secondary"
              onClick={(e: React.MouseEvent) => {
                e.preventDefault()
                e.stopPropagation()
                window.open(
                  EXTERNAL_LINKS.JURIS,
                  "_blank",
                  "noopener,noreferrer",
                )
              }}
            >
              {t("defaultedMarkets.jurisButton")}
            </Button>
          ) : (
            <Button
              size="small"
              variant="contained"
              color="secondary"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              {t("dashboard.markets.tables.other.depositBTN")}
            </Button>
          )}
        </Box>
      ),
    },
  ]
  const columns = isDefaultedTab
    ? allColumns.filter((column) => column.field !== "loan")
    : allColumns

  const gridMinWidth = getGridMinWidth(columns, 2 * DATA_GRID_SIDE_PADDING)

  let noMarketsTitle = t("dashboard.markets.noMarkets.active.title")
  let noMarketsSubtitle: string | undefined = t(
    "dashboard.markets.noMarkets.active.lenderSubtitle",
  )
  if (composableOnly) {
    noMarketsTitle = t("destinations.noComposableMarkets")
    noMarketsSubtitle = undefined
  } else if (isDefaultedTab && isDefaultsError) {
    noMarketsTitle = t("defaultedMarkets.unavailable.title")
    noMarketsSubtitle = t("defaultedMarkets.unavailable.subtitle")
  } else if (isDefaultedTab) {
    noMarketsTitle = t("defaultedMarkets.noMarkets.title")
    noMarketsSubtitle = t("defaultedMarkets.noMarkets.subtitle")
  }

  const showDefaultedEmpty =
    isDefaultedTab &&
    (isDefaultsError ||
      (nameFilter === "" &&
        assetFilter.length === 0 &&
        statusFilter.length === 0 &&
        !withdrawalCycleFilter?.length))

  const mobileListHeader = isDefaultedTab ? (
    <>
      {mobileHeader}
      <DefaultedPositionsHeading sx={{ padding: "12px 8px" }} />
    </>
  ) : (
    mobileHeader
  )

  if (isMobile)
    return (
      <MobileMarketList
        key={tab}
        markets={tabRows}
        isLoading={isLoading}
        header={mobileListHeader}
        // The Defaulted tab drops the composable block, as it does the column
        destinationsByMarket={isDefaultedTab ? undefined : destinationsByMarket}
        resetKey={JSON.stringify([
          tab,
          nameFilter,
          assetFilter.map((asset) => asset.id),
          statusFilter,
          withdrawalCycleFilter?.map((cycle) => cycle.id),
          composableOnly,
        ])}
        emptyTitle={
          composableOnly || showDefaultedEmpty ? noMarketsTitle : undefined
        }
        emptySubtitle={showDefaultedEmpty ? noMarketsSubtitle : undefined}
      />
    )

  return (
    <ComposableExpansionProvider destinations={destinations}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: isDefaultedTab
            ? "calc(100vh - 330px)"
            : "calc(100vh - 250px)",
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
          label={tabLabel}
          marketsLength={tabRows.length}
          isLoading={isLoading}
          isOpen
          noMarketsTitle={noMarketsTitle}
          noMarketsSubtitle={noMarketsSubtitle}
          nameFilter={filters.nameFilter}
          assetFilter={filters.assetFilter}
          statusFilter={filters.statusFilter}
          showNoFilteredMarkets
        >
          <DataGrid
            disableVirtualization
            sx={clickableGridSx}
            rowHeight={66}
            resizeThrottleMs={COMPOSABLE_GRID_RESIZE_THROTTLE_MS}
            rows={tabRows}
            columns={columns}
            columnHeaderHeight={40}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[50]}
            slots={{
              row: MarketLinkRow,
              pagination: TablePagination,
            }}
            hideFooter={tabRows.length <= paginationModel.pageSize}
          />
        </MarketsTableAccordion>
      </Box>
    </ComposableExpansionProvider>
  )
}
