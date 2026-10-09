import { useEffect, useRef } from "react"
import * as React from "react"

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
import { MarketTypeChip } from "@/components/@extended/MarketTypeChip"
import {
  getAdsCellProps,
  getAdsTooltipComponent,
} from "@/components/AdsBanners/adsHelpers"
import { AprChip } from "@/components/AprChip"
import { BorrowerProfileChip } from "@/components/BorrowerProfileChip"
import {
  COMPOSABLE_GRID_RESIZE_THROTTLE_MS,
  ComposableChipCell,
  ComposableExpansionProvider,
  ComposableRowPanel,
} from "@/components/Destinations"
import { MarketsTableAccordion } from "@/components/MarketsTableAccordion"
import { MobileMarketList } from "@/components/Mobile/MobileMarketList"
import { TablePagination } from "@/components/TablePagination"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { ROUTES } from "@/routes"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setScrollTarget } from "@/store/slices/lenderDashboardSlice/lenderDashboardSlice"
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
import {
  getLenderMarketAction,
  getKnownMarketOnboardingMode,
  LenderMarketAction,
  MarketOnboardingMode,
} from "@/utils/marketOnboarding"
import { getMarketStatusChip } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

import { OtherMarketsTableModel, OtherMarketsTableProps } from "./interface"
import { DATA_GRID_SIDE_PADDING, DataGridSx } from "../style"

const NO_DESTINATIONS_BY_MARKET: NonNullable<
  OtherMarketsTableProps["destinationsByMarket"]
> = {}

const COMPOSABLE_COLUMN_WIDTH = 136
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
      chainId={props.row.chainId}
      marketSymbol={props.row.marketTokenSymbol}
      aprBips={props.row.apr}
      withdrawalBatchDuration={props.row.withdrawalBatchDuration}
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

export const OtherMarketsTable = ({
  marketAccounts,
  onboardingByMarket,
  borrowers,
  isLoading,
  filters,
  destinationsByMarket = NO_DESTINATIONS_BY_MARKET,
  mobileHeader,
}: OtherMarketsTableProps) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const isMobile = useMobileResolution()

  const scrollTargetId = useAppSelector(
    (state) => state.lenderDashboard.scrollTarget,
  )

  const selfOnboardRef = useRef<HTMLDivElement>(null)
  const manualRef = useRef<HTMLDivElement>(null)
  const terminatedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isMobile) {
      if (scrollTargetId === "self-onboard" && selfOnboardRef.current) {
        selfOnboardRef.current.scrollIntoView({ behavior: "smooth" })
        dispatch(setScrollTarget(null))
      }
      if (scrollTargetId === "manual" && manualRef.current) {
        manualRef.current.scrollIntoView({ behavior: "smooth" })
        dispatch(setScrollTarget(null))
      }
      if (scrollTargetId === "other-terminated" && terminatedRef.current) {
        terminatedRef.current.scrollIntoView({ behavior: "smooth" })
        dispatch(setScrollTarget(null))
      }
    }
  }, [dispatch, isMobile, scrollTargetId])

  const rows: GridRowsProp<OtherMarketsTableModel> = marketAccounts.map(
    (account) => {
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

      const borrower = borrowers.find(
        (b) => b.address.toLowerCase() === borrowerAddress.toLowerCase(),
      )
      const borrowerName = borrower
        ? borrower.alias || borrower.name
        : trimAddress(borrowerAddress)

      const marketStatus = getMarketStatusChip(market)
      const marketType = getMarketTypeChip(market)

      return {
        id: address,
        status: marketStatus,
        term: marketType,
        name,
        borrower: borrowerName,
        borrowerAddress,
        asset: underlyingToken.symbol,
        apr: annualInterestBips,
        withdrawalBatchDuration,
        debt: totalSupply,
        capacity: maxTotalSupply,
        capacityLeft: maxTotalSupply.sub(totalSupply),
        onboardingMode: getKnownMarketOnboardingMode(
          market.version,
          market.address,
          onboardingByMarket,
        ),
        depositStatus: account.depositAvailability,
        button: address,
        chainId,
        destinationsCount:
          destinationsByMarket[address.toLowerCase()]?.length ?? 0,
        marketTokenSymbol: market.marketToken.symbol,
      }
    },
  )

  const showComposableColumn = Object.keys(destinationsByMarket).length > 0

  const terminated = rows.filter((market) => {
    const account = marketAccounts.find((a) => a.market.address === market.id)
    return account?.market.isClosed
  })

  const activeRows = rows.filter((market) => {
    const account = marketAccounts.find((a) => a.market.address === market.id)
    return !account?.market.isClosed
  })

  const selfOnboard = activeRows.filter(
    (market) => market.onboardingMode === MarketOnboardingMode.SelfOnboard,
  )
  const manual = activeRows.filter(
    (market) => market.onboardingMode === MarketOnboardingMode.BorrowerApproval,
  )

  const columns: TypeSafeColDef<OtherMarketsTableModel>[] = [
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
      sortComparator: statusComparator,
      renderCell: (params) => (
        <Box
          sx={{
            ...LinkCell,
            justifyContent: "flex-start",
          }}
        >
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
        <Box
          sx={{
            ...LinkCell,
            justifyContent: "flex-start",
          }}
        >
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
        <Box
          sx={{
            ...LinkCell,
            justifyContent: "flex-end",
          }}
        >
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
        <Box
          sx={{
            ...LinkCell,
            justifyContent: "flex-end",
          }}
        >
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
        params: GridRenderCellParams<OtherMarketsTableModel, TokenAmount>,
      ) => (
        <Box
          sx={{
            ...LinkCell,
            justifyContent: "flex-end",
          }}
        >
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
      sortComparator: tokenAmountComparator,
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
    ...(showComposableColumn
      ? [
          {
            field: "destinationsCount",
            headerName: t("destinations.column"),
            width: COMPOSABLE_COLUMN_WIDTH,
            headerAlign: "right",
            align: "right",
            sortable: true,
            renderCell: (
              params: GridRenderCellParams<OtherMarketsTableModel, number>,
            ) => (
              <ComposableChipCell
                rowId={params.row.id}
                count={params.row.destinationsCount}
              />
            ),
          } satisfies TypeSafeColDef<OtherMarketsTableModel>,
        ]
      : []),
    {
      sortable: false,
      field: "button",
      headerName: "",
      ...(showComposableColumn
        ? { width: ACTION_COLUMN_WIDTH }
        : { minWidth: 100, flex: 1 }),
      headerAlign: "right",
      align: "right",
      renderCell: (params) => {
        const action = getLenderMarketAction(
          params.row.onboardingMode,
          params.row.depositStatus,
        )

        return (
          <Box sx={{ ...LinkCell, justifyContent: "flex-end" }}>
            {action === LenderMarketAction.Deposit && (
              <Button
                size="small"
                variant="contained"
                color="secondary"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                {t("dashboard.markets.tables.other.depositBTN")}
              </Button>
            )}
            {action === LenderMarketAction.RequestAccess && (
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
            {(action === LenderMarketAction.DepositUnavailable ||
              action === LenderMarketAction.Unavailable) && (
              <Button
                size="small"
                variant="contained"
                color="secondary"
                disabled
              >
                {action === LenderMarketAction.DepositUnavailable
                  ? t("dashboard.markets.tables.other.depositBTN")
                  : "Unavailable"}
              </Button>
            )}
          </Box>
        )
      },
    },
  ]

  const gridMinWidth = getGridMinWidth(columns, 2 * DATA_GRID_SIDE_PADDING)

  const [selfOnboardPaginationModel, setSelfOnboardPaginationModel] =
    React.useState({
      pageSize: 50,
      page: 0,
    })

  const [manualPaginationModel, setManualPaginationModel] = React.useState({
    pageSize: 50,
    page: 0,
  })

  const [terminatedPaginationModel, setTerminatedPaginationModel] =
    React.useState({
      pageSize: 50,
      page: 0,
    })

  const { assetFilter, statusFilter, nameFilter, composableOnly } = filters

  useEffect(() => {
    setSelfOnboardPaginationModel((prevState) => ({ ...prevState, page: 0 }))
    setManualPaginationModel((prevState) => ({ ...prevState, page: 0 }))
    setTerminatedPaginationModel((prevState) => ({ ...prevState, page: 0 }))
  }, [assetFilter, statusFilter, nameFilter, composableOnly])

  if (isMobile) {
    const mobileMarkets = {
      "self-onboard": selfOnboard,
      manual,
      "other-terminated": terminated,
    }[scrollTargetId ?? ""]

    if (!mobileMarkets) return null

    return (
      <MobileMarketList
        key={scrollTargetId}
        markets={mobileMarkets}
        isLoading={isLoading}
        header={mobileHeader}
        showDestinations
        emptyTitle={
          composableOnly ? t("destinations.noComposableMarkets") : undefined
        }
      />
    )
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: `calc(100vh - 268px)`,
        width: "100%",
        overflow: "auto",
        overflowY: "auto",
        gap: "16px",
        marginTop: "24px",
        paddingBottom: "26px",
      }}
    >
      <ComposableExpansionProvider>
        <Box id="self-onboard" ref={selfOnboardRef}>
          <MarketsTableAccordion
            minContentWidth={gridMinWidth}
            label={t("dashboard.markets.tables.other.selfOnboard")}
            marketsLength={selfOnboard.length}
            isLoading={isLoading}
            isOpen
            nameFilter={filters.nameFilter}
            assetFilter={filters.assetFilter}
            statusFilter={filters.statusFilter}
            showNoFilteredMarkets
            noMarketsTitle={
              composableOnly ? t("destinations.noComposableMarkets") : undefined
            }
          >
            <DataGrid
              disableVirtualization
              sx={clickableGridSx}
              rowHeight={66}
              resizeThrottleMs={COMPOSABLE_GRID_RESIZE_THROTTLE_MS}
              rows={selfOnboard}
              columns={columns}
              columnHeaderHeight={40}
              paginationModel={selfOnboardPaginationModel}
              onPaginationModelChange={setSelfOnboardPaginationModel}
              slots={{
                row: MarketLinkRow,
                pagination: TablePagination,
              }}
              hideFooter={false}
            />
          </MarketsTableAccordion>
        </Box>
        <Box id="manual" ref={manualRef}>
          <MarketsTableAccordion
            minContentWidth={gridMinWidth}
            label={t("dashboard.markets.tables.other.manual")}
            isLoading={isLoading}
            isOpen
            marketsLength={manual.length}
            nameFilter={filters.nameFilter}
            assetFilter={filters.assetFilter}
            statusFilter={filters.statusFilter}
            showNoFilteredMarkets
            noMarketsTitle={
              composableOnly ? t("destinations.noComposableMarkets") : undefined
            }
          >
            <DataGrid
              disableVirtualization
              sx={clickableGridSx}
              rowHeight={66}
              resizeThrottleMs={COMPOSABLE_GRID_RESIZE_THROTTLE_MS}
              rows={manual}
              columns={columns}
              columnHeaderHeight={40}
              paginationModel={manualPaginationModel}
              onPaginationModelChange={setManualPaginationModel}
              slots={{
                row: MarketLinkRow,
                pagination: TablePagination,
              }}
              hideFooter={false}
            />
          </MarketsTableAccordion>
        </Box>

        <Box id="other-terminated" ref={terminatedRef}>
          <MarketsTableAccordion
            minContentWidth={gridMinWidth}
            label={t("dashboard.markets.tables.other.terminated")}
            marketsLength={terminated.length}
            isLoading={isLoading}
            isOpen
            nameFilter={filters.nameFilter}
            assetFilter={filters.assetFilter}
            statusFilter={filters.statusFilter}
            showNoFilteredMarkets
            noMarketsTitle={
              composableOnly ? t("destinations.noComposableMarkets") : undefined
            }
          >
            <DataGrid
              disableVirtualization
              sx={clickableGridSx}
              rowHeight={66}
              resizeThrottleMs={COMPOSABLE_GRID_RESIZE_THROTTLE_MS}
              rows={terminated}
              columns={columns}
              columnHeaderHeight={40}
              paginationModel={terminatedPaginationModel}
              onPaginationModelChange={setTerminatedPaginationModel}
              slots={{
                row: MarketLinkRow,
                pagination: TablePagination,
              }}
              hideFooter={false}
            />
          </MarketsTableAccordion>
        </Box>
      </ComposableExpansionProvider>
    </Box>
  )
}
