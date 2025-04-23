import { useEffect, useRef } from "react"
import * as React from "react"

import { Box, Button, Typography, useMediaQuery, Theme } from "@mui/material"
import { DataGrid, GridRenderCellParams, GridRowsProp } from "@mui/x-data-grid"
import {
  DepositStatus,
  MarketAccount,
  MarketVersion,
  TokenAmount,
} from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { TypeSafeColDef } from "@/app/[locale]/borrower/components/MarketsSection/сomponents/MarketsTables/interface"
import { MarketsTableModel } from "@/app/[locale]/borrower/components/MarketsTables/interface"
import { LinkCell } from "@/app/[locale]/borrower/components/MarketsTables/style"
import {
  BorrowerWithName,
  useBorrowerNames,
} from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketTypeChip } from "@/components/@extended/MarketTypeChip"
import { MarketCard } from "@/components/MarketCard"
import { SmallFilterSelectItem } from "@/components/SmallFilterSelect"
import { TablePagination } from "@/components/TablePagination"
import { ROUTES } from "@/routes"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setScrollTarget } from "@/store/slices/marketsOverviewSidebarSlice/marketsOverviewSidebarSlice"
import { COLORS } from "@/theme/colors"
import {
  statusComparator,
  tokenAmountComparator,
  typeComparator,
} from "@/utils/comparators"
import { pageCalcHeights } from "@/utils/constants"
import {
  formatBps,
  formatTokenWithCommas,
  trimAddress,
} from "@/utils/formatters"
import { getMarketStatusChip, MarketStatus } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

import { MarketsTableAccordion } from "../../../../../../../../components/MarketsTableAccordion"

export type LenderOtherMarketsTableModel = {
  id: string
  status: ReturnType<typeof getMarketStatusChip>
  term: ReturnType<typeof getMarketTypeChip>
  name: string
  borrower: string | undefined
  borrowerAddress: string
  asset: string
  debt: TokenAmount | undefined
  apr: number
  isSelfOnboard: boolean
  button?: string
  capacityLeft: TokenAmount
}

export const OtherMarketsTables = ({
  marketAccounts,
  isLoading,
  filters,
  borrowers,
  isMobile,
}: {
  marketAccounts: MarketAccount[]
  borrowers: BorrowerWithName[]
  isLoading: boolean
  filters: {
    nameFilter: string
    assetFilter: SmallFilterSelectItem[]
    statusFilter: MarketStatus[]
  }
  isMobile?: boolean
}) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const isSmallScreen = useMediaQuery((theme: Theme) => 
    theme.breakpoints.down("md"),
  )
  const mobileView = isMobile || isSmallScreen

  const scrollTargetId = useAppSelector(
    (state) => state.lenderDashboard.scrollTarget,
  )

  const selfOnboardRef = useRef<HTMLDivElement>(null)
  const manualRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollTargetId === "self-onboard" && selfOnboardRef.current) {
      selfOnboardRef.current.scrollIntoView({ behavior: "smooth" })
      dispatch(setScrollTarget(null))
    }
    if (scrollTargetId === "manual" && manualRef.current) {
      manualRef.current.scrollIntoView({ behavior: "smooth" })
      dispatch(setScrollTarget(null))
    }
  }, [scrollTargetId])

  const rows: GridRowsProp<LenderOtherMarketsTableModel> = marketAccounts.map(
    (account) => {
      const { market } = account

      const {
        address,
        name,
        borrower: borrowerAddress,
        underlyingToken,
        annualInterestBips,
        totalDebts,
        maxTotalSupply,
      } = market

      const borrower = (borrowers ?? []).find(
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
        debt: totalDebts,
        capacityLeft: maxTotalSupply.sub(totalDebts),
        isSelfOnboard:
          !account.hasEverInteracted &&
          market.version === MarketVersion.V2 &&
          account.depositAvailability === DepositStatus.Ready,
        button: address,
      }
    },
  )

  const selfOnboard = rows.filter((market) => market.isSelfOnboard)
  const manual = rows.filter((market) => !market.isSelfOnboard)

  const columns: TypeSafeColDef<LenderOtherMarketsTableModel>[] = [
    {
      field: "status",
      headerName: t("dashboard.markets.tables.header.status"),
      minWidth: 120,
      flex: 0.7,
      headerAlign: "left",
      align: "left",
      sortComparator: statusComparator,
      renderCell: (params) => (
        <Link
          href={`${ROUTES.lender.market}/${params.row.id}`}
          style={{
            ...LinkCell,
            justifyContent: "flex-start",
          }}
        >
          <Box width="130px">
            <MarketStatusChip status={params.value} />
          </Box>
        </Link>
      ),
    },
    {
      field: "term",
      headerName: t("dashboard.markets.tables.header.term"),
      minWidth: 170,
      flex: 1,
      headerAlign: "left",
      align: "left",
      sortComparator: typeComparator,
      renderCell: (params) => (
        <Link
          href={`${ROUTES.lender.market}/${params.row.id}`}
          style={{
            ...LinkCell,
            justifyContent: "flex-start",
          }}
        >
          <Box minWidth="170px">
            <MarketTypeChip {...params.value} />
          </Box>
        </Link>
      ),
    },
    {
      field: "name",
      headerName: t("dashboard.markets.tables.header.name"),
      flex: 3,
      minWidth: 208,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <Link
          href={`${ROUTES.lender.market}/${params.row.id}`}
          style={{
            ...LinkCell,
            justifyContent: "flex-start",
          }}
        >
          {params.value}
        </Link>
      ),
    },
    {
      field: "borrower",
      minWidth: 134,
      flex: 1.7,
      headerAlign: "left",
      align: "left",
      renderHeader: () => (
        <Typography
          variant="text4"
          sx={{
            lineHeight: "10px",
            color: COLORS.santasGrey,
            padding: "0 12px",
          }}
        >
          {t("dashboard.markets.tables.header.borrower")}
        </Typography>
      ),
      renderCell: (params) => (
        <Link
          href={`${ROUTES.lender.market}/${params.row.id}`}
          style={{
            textDecoration: "none",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            color: "inherit",
            justifyContent: "flex-start",
          }}
        >
          <Link
            href={`${ROUTES.lender.profile}/${params.row.borrowerAddress}`}
            style={{
              textDecoration: "underline",
              width: "fit-content",
              height: "fit-content",
            }}
          >
            <Button
              size="small"
              variant="text"
              sx={{
                fontSize: "13px",
                textDecoration: "underline",
                color: "#00008B",
                lineHeight: "20px",
                fontWeight: 500,
                minWidth: "fit-content",
                width: "fit-content",
              }}
            >
              {params.value}
            </Button>
          </Link>
        </Link>
      ),
    },
    {
      field: "apr",
      headerName: t("dashboard.markets.tables.header.apr"),
      minWidth: 102,
      flex: 1,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => (
        <Link
          href={`${ROUTES.lender.market}/${params.row.id}`}
          style={{ ...LinkCell, justifyContent: "flex-end" }}
        >
          {`${formatBps(params.value)}%`}
        </Link>
      ),
    },
    {
      field: "asset",
      headerName: t("dashboard.markets.tables.header.asset"),
      minWidth: 95,
      headerAlign: "right",
      align: "right",
      flex: 1,
      renderCell: (params) => (
        <Link
          href={`${ROUTES.lender.market}/${params.row.id}`}
          style={{ ...LinkCell, justifyContent: "flex-end" }}
        >
          {params.value}
        </Link>
      ),
    },
    {
      field: "capacityLeft",
      headerName: t("dashboard.markets.tables.header.capacity"),
      minWidth: 82,
      headerAlign: "right",
      align: "right",
      sortComparator: tokenAmountComparator,
      flex: 1.5,
      renderCell: (
        params: GridRenderCellParams<MarketsTableModel, TokenAmount>,
      ) => (
        <Link
          href={`${ROUTES.lender.market}/${params.row.id}`}
          style={{
            textDecoration: "none",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            color: "inherit",
            justifyContent: "flex-end",
          }}
        >
          {params.value && params.value.gt(0)
            ? formatTokenWithCommas(params.value, {
                withSymbol: false,
                fractionDigits: 2,
              })
            : "0"}
        </Link>
      ),
    },
    {
      field: "debt",
      headerName: t("dashboard.markets.tables.header.debt"),
      minWidth: 110,
      headerAlign: "right",
      align: "right",
      flex: 1.5,
      sortComparator: tokenAmountComparator,
      renderCell: (params) => (
        <Link
          href={`${ROUTES.lender.market}/${params.row.id}`}
          style={{ ...LinkCell, justifyContent: "flex-end" }}
        >
          {params.value
            ? formatTokenWithCommas(params.value, {
                withSymbol: false,
                fractionDigits: 2,
              })
            : "0"}
        </Link>
      ),
    },
    {
      sortable: false,
      field: "button",
      headerName: "",
      minWidth: 102,
      flex: 1,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => (
        <Link
          href={
            params.row.isSelfOnboard
              ? `${ROUTES.lender.market}/${params.row.id}`
              : `${ROUTES.lender.profile}/${params.row.borrowerAddress}`
          }
          style={{ ...LinkCell, justifyContent: "flex-end" }}
        >
          <Button size="small" variant="contained" color="secondary">
            {params.row.isSelfOnboard
              ? `${t("dashboard.markets.tables.other.depositBTN")}`
              : `${t("dashboard.markets.tables.other.requestBTN")}`}
          </Button>
        </Link>
      ),
    },
  ]

  const [selfOnboardPaginationModel, setSelfOnboardPaginationModel] =
    React.useState({
      pageSize: 10,
      page: 0,
    })

  const [manualPaginationModel, setManualPaginationModel] = React.useState({
    pageSize: 10,
    page: 0,
  })

  const { assetFilter, statusFilter, nameFilter } = filters

  useEffect(() => {
    setSelfOnboardPaginationModel((prevState) => ({ ...prevState, page: 0 }))
    setManualPaginationModel((prevState) => ({ ...prevState, page: 0 }))
  }, [assetFilter, statusFilter, nameFilter])

  // Render market cards for mobile view
  const renderMarketCards = (markets: LenderOtherMarketsTableModel[]) => 
    markets.map((market) => {
      const aprFormatted = `${formatBps(market.apr)}%`
      const capacityFormatted = market.capacityLeft
        ? formatTokenWithCommas(market.capacityLeft, {
            withSymbol: false,
            fractionDigits: 2,
          })
        : "0"
      const debtFormatted = market.debt
        ? formatTokenWithCommas(market.debt, {
            withSymbol: false,
            fractionDigits: 2,
          })
        : "0"

      // Get status string from the market status
      const statusText = market.status.status
      const isDelinquent = market.status.status === MarketStatus.DELINQUENT

      return (
        <MarketCard
          key={market.id}
          marketName={market.name}
          borrowerName={market.borrower}
          borrowerAddress={market.borrowerAddress}
          marketAddress={market.id}
          assetName={market.asset}
          apr={aprFormatted}
          marketLink={
            market.isSelfOnboard
              ? `${ROUTES.lender.market}/${market.id}`
              : `${ROUTES.lender.profile}/${market.borrowerAddress}`
          }
          capacity={`${capacityFormatted} ${market.asset}`}
          totalDeposited={`${debtFormatted} ${market.asset}`}
          delinquent={isDelinquent}
          status={statusText}
          isLender
        />
      )
    })

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: mobileView 
          ? "auto" 
          : `calc(100vh - ${pageCalcHeights.dashboard})`,
        width: "100%",
        overflow: "auto",
        overflowY: "auto",
        gap: "16px",
        marginTop: "24px",
        paddingBottom: "26px",
        paddingX: mobileView ? "16px" : 0,
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
          isMobile={mobileView}
        >
          {mobileView ? (
            <Box sx={{ padding: "12px", width: "100%" }}>
              {renderMarketCards(selfOnboard)}
            </Box>
          ) : (
            <DataGrid
              sx={{
                overflow: "auto",
                maxWidth: "100%",
                padding: "0 16px",
                "& .MuiDataGrid-columnHeader": { padding: 0 },
                "& .MuiDataGrid-cell": { padding: "0px" },
              }}
              rows={selfOnboard}
              columns={columns}
              columnHeaderHeight={40}
              paginationModel={selfOnboardPaginationModel}
              onPaginationModelChange={setSelfOnboardPaginationModel}
              slots={{
                pagination: TablePagination,
              }}
              hideFooter={false}
            />
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
          isMobile={mobileView}
        >
          {mobileView ? (
            <Box sx={{ padding: "12px", width: "100%" }}>
              {renderMarketCards(manual)}
            </Box>
          ) : (
            <DataGrid
              sx={{
                overflow: "auto",
                maxWidth: "100%",
                padding: "0 16px",
                "& .MuiDataGrid-columnHeader": { padding: 0 },
                "& .MuiDataGrid-cell": { padding: "0px" },
              }}
              rows={manual}
              columns={columns}
              columnHeaderHeight={40}
              paginationModel={manualPaginationModel}
              onPaginationModelChange={setManualPaginationModel}
              slots={{
                pagination: TablePagination,
              }}
              hideFooter={false}
            />
          )}
        </MarketsTableAccordion>
      </Box>
    </Box>
  )
}
