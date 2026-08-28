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
import {
  buildMarketHref,
  formatBps,
  formatSecsToHours,
  formatTokenWithCommas,
  trimAddress,
} from "@/utils/formatters"
import { getDisplayLenderAprBips } from "@/utils/marketApr"
import { getMarketImplementationType } from "@/utils/marketImplementation"
import {
  getLenderMarketAction,
  getKnownMarketOnboardingMode,
  isSelfServiceMarketOnboardingMode,
  LenderMarketAction,
  MarketOnboardingMode,
} from "@/utils/marketOnboarding"
import { getMarketStatusChip } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

import { OtherMarketsTableModel, OtherMarketsTableProps } from "./interface"
import { DataGridSx } from "../style"

const MarketLinkRow = (props: GridRowProps) => (
  <Link
    href={buildMarketHref(props.row.id, props.row.chainId)}
    style={{ display: "contents", color: "inherit" }}
    tabIndex={-1}
  >
    <GridRow {...props} />
  </Link>
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
        implementationType: getMarketImplementationType(market),
        status: marketStatus,
        term: marketType,
        name,
        borrower: borrowerName,
        borrowerAddress,
        asset: underlyingToken.symbol,
        apr: getDisplayLenderAprBips(market),
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
      }
    },
  )

  const terminated = rows.filter((market) => {
    const account = marketAccounts.find((a) => a.market.address === market.id)
    return account?.market.isClosed
  })

  const activeRows = rows.filter((market) => {
    const account = marketAccounts.find((a) => a.market.address === market.id)
    return !account?.market.isClosed
  })

  const selfOnboard = activeRows.filter((market) =>
    isSelfServiceMarketOnboardingMode(market.onboardingMode),
  )
  const manual = activeRows.filter(
    (market) => market.onboardingMode === MarketOnboardingMode.Managed,
  )

  const columns: TypeSafeColDef<OtherMarketsTableModel>[] = [
    {
      field: "name",
      headerName: t("common.fields.marketName"),
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
      headerName: t("common.fields.status"),
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
      headerName: t("common.fields.term"),
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
      headerName: t("common.fields.apr"),
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
      headerName: t("marketList.shared.tables.header.withdrawal"),
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
      headerName: t("common.fields.asset"),
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
      headerName: t("marketList.shared.tables.header.capacity"),
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
                compact: true,
              })
            : "0"}
        </Box>
      ),
    },
    {
      field: "debt",
      headerName: t("common.fields.totalDebt"),
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
      sortable: false,
      field: "button",
      headerName: "",
      minWidth: 100,
      flex: 1,
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
                {t("marketList.shared.tables.other.depositBTN")}
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
                  {t("marketList.shared.tables.other.requestBTN")}
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
                  ? t("marketList.shared.tables.other.depositBTN")
                  : "Unavailable"}
              </Button>
            )}
          </Box>
        )
      },
    },
  ]

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

  const { assetFilter, statusFilter, nameFilter } = filters

  useEffect(() => {
    setSelfOnboardPaginationModel((prevState) => ({ ...prevState, page: 0 }))
    setManualPaginationModel((prevState) => ({ ...prevState, page: 0 }))
    setTerminatedPaginationModel((prevState) => ({ ...prevState, page: 0 }))
  }, [assetFilter, statusFilter, nameFilter])

  if (isMobile)
    return (
      <>
        {scrollTargetId === "self-onboard" && (
          <MobileMarketList markets={selfOnboard} isLoading={isLoading} />
        )}
        {scrollTargetId === "manual" && (
          <MobileMarketList markets={manual} isLoading={isLoading} />
        )}
        {scrollTargetId === "other-terminated" && (
          <MobileMarketList markets={terminated} isLoading={isLoading} />
        )}
      </>
    )

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
      <Box id="self-onboard" ref={selfOnboardRef}>
        <MarketsTableAccordion
          label={t("marketList.shared.tables.other.selfOnboard")}
          marketsLength={selfOnboard.length}
          isLoading={isLoading}
          isOpen
          nameFilter={filters.nameFilter}
          assetFilter={filters.assetFilter}
          statusFilter={filters.statusFilter}
          showNoFilteredMarkets
        >
          <DataGrid
            disableVirtualization
            sx={clickableGridSx}
            rowHeight={66}
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
          label={t("marketList.shared.tables.other.manual")}
          isLoading={isLoading}
          isOpen
          marketsLength={manual.length}
          nameFilter={filters.nameFilter}
          assetFilter={filters.assetFilter}
          statusFilter={filters.statusFilter}
          showNoFilteredMarkets
        >
          <DataGrid
            disableVirtualization
            sx={clickableGridSx}
            rowHeight={66}
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
          label={t("marketList.shared.tables.other.terminated")}
          marketsLength={terminated.length}
          isLoading={isLoading}
          isOpen
          nameFilter={filters.nameFilter}
          assetFilter={filters.assetFilter}
          statusFilter={filters.statusFilter}
          showNoFilteredMarkets
        >
          <DataGrid
            disableVirtualization
            sx={clickableGridSx}
            rowHeight={66}
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
    </Box>
  )
}
