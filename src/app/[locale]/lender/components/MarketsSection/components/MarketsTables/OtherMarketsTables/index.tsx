import { useEffect, useRef } from "react"
import * as React from "react"

import { Box, Button, Typography } from "@mui/material"
import { DataGrid, GridRenderCellParams, GridRowsProp } from "@mui/x-data-grid"
import { TokenAmount } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { TypeSafeColDef } from "@/app/[locale]/borrower/components/MarketsSection/сomponents/MarketsTables/interface"
import { LinkCell } from "@/app/[locale]/borrower/components/MarketsTables/style"
import { useBorrowerNames } from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import {
  clickableGridSx,
  rowLinkInteractiveSx,
  rowLinkStretchedSx,
} from "@/app/[locale]/lender/components/MarketsSection/components/MarketsTables/style"
import { MarketImplementationChip } from "@/components/@extended/MarketImplementationChip"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketTypeChip } from "@/components/@extended/MarketTypeChip"
import {
  getAdsCellProps,
  getAdsTooltipComponent,
} from "@/components/AdsBanners/adsHelpers"
import { AprChip } from "@/components/AprChip"
import { BorrowerProfileChip } from "@/components/BorrowerProfileChip"
import { MarketsTableAccordion } from "@/components/MarketsTableAccordion"
import { MobileMarketCard } from "@/components/Mobile/MobileMarketCard"
import { MobileMarketList } from "@/components/Mobile/MobileMarketList"
import { TablePagination } from "@/components/TablePagination"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { useMarketRowPrefetchHandlers } from "@/hooks/usePrefetchMarketDetailMetadata"
import { ROUTES } from "@/routes"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setScrollTarget } from "@/store/slices/marketsOverviewSidebarSlice/marketsOverviewSidebarSlice"
import {
  implementationComparator,
  statusComparator,
  tokenAmountComparator,
  typeComparator,
} from "@/utils/comparators"
import { pageCalcHeights } from "@/utils/constants"
import {
  buildMarketHref,
  formatBps,
  formatSecsToHours,
  formatTokenWithCommas,
  trimAddress,
} from "@/utils/formatters"
import { getDisplayLenderAprBips } from "@/utils/marketApr"
import { isSelfOnboardMarketAccount } from "@/utils/marketCapabilities"
import { getMarketImplementationType } from "@/utils/marketImplementation"
import { getMarketStatusChip } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

import {
  LenderOtherMarketsTableModel,
  LenderOtherMarketsTableProps,
} from "./interface"

export const OtherMarketsTables = ({
  marketAccounts,
  isLoading,
  filters,
}: LenderOtherMarketsTableProps) => {
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

  const { data: borrowers } = useBorrowerNames()

  const rows: GridRowsProp<LenderOtherMarketsTableModel> = marketAccounts.map(
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

      const borrower = (borrowers ?? []).find(
        (b) => b.address.toLowerCase() === borrowerAddress.toLowerCase(),
      )
      const borrowerName = borrower
        ? borrower.alias || borrower.name
        : trimAddress(borrowerAddress)

      const marketStatus = getMarketStatusChip(market)
      const implementationType = getMarketImplementationType(market)
      const marketType = getMarketTypeChip(market)

      return {
        id: address,
        implementationType,
        status: marketStatus,
        term: marketType,
        name,
        borrower: borrowerName,
        borrowerAddress,
        asset: underlyingToken.symbol,
        apr: getDisplayLenderAprBips(market),
        withdrawalBatchDuration,
        debt: totalSupply,
        capacityLeft: maxTotalSupply.sub(totalSupply),
        isSelfOnboard: isSelfOnboardMarketAccount(account),
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

  const selfOnboard = activeRows.filter((market) => market.isSelfOnboard)
  const manual = activeRows.filter((market) => !market.isSelfOnboard)
  const selfOnboardPrefetchHandlers = useMarketRowPrefetchHandlers(selfOnboard)
  const manualPrefetchHandlers = useMarketRowPrefetchHandlers(manual)
  const terminatedPrefetchHandlers = useMarketRowPrefetchHandlers(terminated)

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
          <Box
            component={Link}
            href={buildMarketHref(params.row.id, params.row.chainId)}
            sx={rowLinkStretchedSx}
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
          </Box>

          {params.row.borrowerAddress ? (
            <Box
              component={Link}
              href={`${ROUTES.lender.profile}/${params.row.borrowerAddress}`}
              prefetch={false}
              sx={{
                ...rowLinkInteractiveSx,
                display: "flex",
                textDecoration: "none",
              }}
            >
              <BorrowerProfileChip borrower={params.row.borrower} />
            </Box>
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
      field: "implementationType",
      headerName: t("dashboard.markets.tables.header.type"),
      minWidth: 110,
      flex: 1,
      headerAlign: "left",
      align: "left",
      sortComparator: implementationComparator,
      renderCell: (params) => (
        <Box
          sx={{
            ...LinkCell,
            justifyContent: "flex-start",
          }}
        >
          <Box minWidth="120px">
            <MarketImplementationChip
              implementationType={params.value}
              type="table"
            />
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
          params.row.id,
          formatBps(params.value),
        )
        const adsCellProps = getAdsCellProps(params.row.id)

        return (
          <Box sx={{ ...LinkCell, justifyContent: "flex-end" }}>
            <Box
              component={Link}
              href={buildMarketHref(params.row.id, params.row.chainId)}
              tabIndex={-1}
              sx={{
                ...rowLinkInteractiveSx,
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <AprChip
                isBonus={!!adsCellProps}
                baseApr={formatBps(params.value)}
                icons={adsCellProps?.icons}
                adsComponent={adsComponent}
              />
            </Box>
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
      sortComparator: tokenAmountComparator,
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
            <Box
              component={Link}
              href={buildMarketHref(params.row.id, params.row.chainId)}
              sx={{ ...rowLinkInteractiveSx, textDecoration: "none" }}
            >
              <Button size="small" variant="contained" color="secondary">
                {t("dashboard.markets.tables.other.depositBTN")}
              </Button>
            </Box>
          ) : (
            <Box
              component={Link}
              href={`${ROUTES.lender.profile}/${params.row.borrowerAddress}`}
              prefetch={false}
              sx={{ ...rowLinkInteractiveSx, textDecoration: "none" }}
            >
              <Button size="small" variant="contained" color="secondary">
                {t("dashboard.markets.tables.other.requestBTN")}
              </Button>
            </Box>
          )}
        </Box>
      ),
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
        height: `calc(100vh - ${pageCalcHeights.dashboard})`,
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
          label={t("dashboard.markets.tables.other.selfOnboard")}
          marketsLength={selfOnboard.length}
          isLoading={isLoading}
          isOpen
          nameFilter={filters.nameFilter}
          assetFilter={filters.assetFilter}
          statusFilter={filters.statusFilter}
          showNoFilteredMarkets
        >
          {isMobile ? (
            <Box display="flex" flexDirection="column">
              {selfOnboard.map((marketItem) => (
                <MobileMarketCard
                  marketItem={marketItem}
                  buttonText="Onboard"
                />
              ))}
            </Box>
          ) : (
            <Box {...selfOnboardPrefetchHandlers}>
              <DataGrid
                disableVirtualization
                sx={clickableGridSx}
                rowHeight={66}
                rows={selfOnboard}
                columns={columns}
                columnHeaderHeight={40}
                paginationModel={selfOnboardPaginationModel}
                onPaginationModelChange={setSelfOnboardPaginationModel}
                slots={{ pagination: TablePagination }}
                hideFooter={false}
              />
            </Box>
          )}
        </MarketsTableAccordion>
      </Box>
      <Box id="manual" ref={manualRef}>
        <MarketsTableAccordion
          label={t("dashboard.markets.tables.other.manual")}
          isLoading={isLoading}
          isOpen
          marketsLength={manual.length}
          nameFilter={filters.nameFilter}
          assetFilter={filters.assetFilter}
          statusFilter={filters.statusFilter}
          showNoFilteredMarkets
        >
          {isMobile ? (
            <Box display="flex" flexDirection="column">
              {manual.map((marketItem) => (
                <MobileMarketCard
                  marketItem={marketItem}
                  buttonText="Request"
                />
              ))}
            </Box>
          ) : (
            <Box {...manualPrefetchHandlers}>
              <DataGrid
                disableVirtualization
                sx={clickableGridSx}
                rowHeight={66}
                rows={manual}
                columns={columns}
                columnHeaderHeight={40}
                paginationModel={manualPaginationModel}
                onPaginationModelChange={setManualPaginationModel}
                slots={{ pagination: TablePagination }}
                hideFooter={false}
              />
            </Box>
          )}
        </MarketsTableAccordion>
      </Box>

      <Box id="other-terminated" ref={terminatedRef}>
        <MarketsTableAccordion
          label={t("dashboard.markets.tables.other.terminated")}
          marketsLength={terminated.length}
          isLoading={isLoading}
          isOpen
          nameFilter={filters.nameFilter}
          assetFilter={filters.assetFilter}
          statusFilter={filters.statusFilter}
          showNoFilteredMarkets
        >
          <Box {...terminatedPrefetchHandlers}>
            <DataGrid
              disableVirtualization
              sx={clickableGridSx}
              rowHeight={66}
              rows={terminated}
              columns={columns}
              columnHeaderHeight={40}
              paginationModel={terminatedPaginationModel}
              onPaginationModelChange={setTerminatedPaginationModel}
              slots={{ pagination: TablePagination }}
              hideFooter={false}
            />
          </Box>
        </MarketsTableAccordion>
      </Box>
    </Box>
  )
}
