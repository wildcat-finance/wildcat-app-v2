import { useEffect, useRef } from "react"
import * as React from "react"

import { Box, Button, Typography, useMediaQuery, Theme } from "@mui/material"
import { DataGrid, GridRenderCellParams, GridRowsProp } from "@mui/x-data-grid"
import { MarketAccount, TokenAmount } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { TypeSafeColDef } from "@/app/[locale]/borrower/components/MarketsSection/сomponents/MarketsTables/interface"
import { MarketsTableModel } from "@/app/[locale]/borrower/components/MarketsTables/interface"
import { LinkCell } from "@/app/[locale]/borrower/components/MarketsTables/style"
import { BorrowerWithName } from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketCard } from "@/components/MarketCard"
import { MarketsTableAccordion } from "@/components/MarketsTableAccordion"
import { SmallFilterSelectItem } from "@/components/SmallFilterSelect"
import { ROUTES } from "@/routes"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setScrollTarget } from "@/store/slices/lenderDashboardSlice/lenderDashboardSlice"
import { COLORS } from "@/theme/colors"
import { statusComparator, tokenAmountComparator } from "@/utils/comparators"
import { pageCalcHeights } from "@/utils/constants"
import {
  formatBps,
  formatTokenWithCommas,
  trimAddress,
} from "@/utils/formatters"
import { getMarketStatusChip, MarketStatus } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

export type LenderTerminatedMarketsTableModel = {
  id: string
  status: ReturnType<typeof getMarketStatusChip>
  term: ReturnType<typeof getMarketTypeChip>
  name: string
  borrower: string | undefined
  borrowerAddress: string
  asset: string
  debt: TokenAmount | undefined
  loan: TokenAmount | undefined
  apr: number
  hasEverInteracted: boolean
}

export const LenderTerminatedMarketsTables = ({
  marketAccounts,
  borrowers,
  isLoading,
  filters,
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

  const prevActiveRef = useRef<HTMLDivElement>(null)
  const neverActiveRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollTargetId === "prev-active" && prevActiveRef.current) {
      prevActiveRef.current.scrollIntoView({ behavior: "smooth" })
      dispatch(setScrollTarget(null))
    }
    if (scrollTargetId === "never-active" && neverActiveRef.current) {
      neverActiveRef.current.scrollIntoView({ behavior: "smooth" })
      dispatch(setScrollTarget(null))
    }
  }, [scrollTargetId])

  const rows: GridRowsProp<LenderTerminatedMarketsTableModel> =
    marketAccounts.map((account) => {
      const { market, marketBalance, hasEverInteracted } = account

      const {
        address,
        borrower: borrowerAddress,
        name,
        underlyingToken,
        annualInterestBips,
        totalBorrowed,
      } = market

      const borrower = borrowers?.find(
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
        loan: marketBalance,
        debt: totalBorrowed,
        hasEverInteracted: account.hasEverInteracted,
      }
    })

  const prevActive = rows.filter((market) => market.hasEverInteracted)

  const neverActive = rows.filter((market) => !market.hasEverInteracted)

  const columns: TypeSafeColDef<LenderTerminatedMarketsTableModel>[] = [
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
              textDecoration: "none",
              width: "fit-content",
              height: "fit-content",
            }}
          >
            <Button
              size="small"
              variant="text"
              sx={{
                fontSize: "13px",
                lineHeight: "20px",
                textDecoration: "underline",
                color: "#00008B",
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
      field: "loan",
      headerName: t("dashboard.markets.tables.header.loan"),
      minWidth: 106,
      flex: 1.6,
      headerAlign: "right",
      align: "right",
      sortComparator: tokenAmountComparator,
      renderCell: (
        params: GridRenderCellParams<MarketsTableModel, TokenAmount>,
      ) => (
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
  ]

  // Render market cards for mobile view
  const renderMarketCards = (markets: LenderTerminatedMarketsTableModel[]) =>
    markets.map((market) => {
      const aprFormatted = `${formatBps(market.apr)}%`
      const debtFormatted = market.debt
        ? formatTokenWithCommas(market.debt, {
            withSymbol: false,
            fractionDigits: 2,
          })
        : "0"
      const loanFormatted = market.loan
        ? formatTokenWithCommas(market.loan, {
            withSymbol: false,
            fractionDigits: 2,
          })
        : "0"

      // Get status string from the market.status object
      const statusText = market.status.status
      const isDelinquent =
        market.status.status === MarketStatus.DELINQUENT ||
        market.status.status === MarketStatus.PENALTY

      return (
        <MarketCard
          key={market.id}
          marketName={market.name}
          borrowerName={market.borrower}
          borrowerAddress={market.borrowerAddress}
          marketAddress={market.id}
          assetName={market.asset}
          apr={aprFormatted}
          marketLink={`${ROUTES.lender.market}/${market.id}`}
          capacity={`${debtFormatted} ${market.asset}`}
          totalDeposited={`${loanFormatted} ${market.asset}`}
          delinquent={isDelinquent}
          status={statusText}
          isLender
          term={market.term}
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
      <Box id="prev-active" ref={prevActiveRef}>
        <MarketsTableAccordion
          label={t("dashboard.markets.tables.borrower.closed.prevActive")}
          marketsLength={prevActive.length}
          isLoading={isLoading}
          isOpen
          nameFilter={filters.nameFilter}
          assetFilter={filters.assetFilter}
          statusFilter={filters.statusFilter}
          showNoFilteredMarkets
          noMarketsTitle={t("dashboard.markets.noMarkets.closed.title")}
          noMarketsSubtitle={t("dashboard.markets.noMarkets.closed.subtitle")}
          isMobile={mobileView}
        >
          {mobileView ? (
            <Box sx={{ padding: "12px" }}>{renderMarketCards(prevActive)}</Box>
          ) : (
            <DataGrid
              sx={{
                overflow: "auto",
                maxWidth: "100%",
                padding: "0 16px",
                "& .MuiDataGrid-columnHeader": { padding: 0 },
                "& .MuiDataGrid-cell": { padding: "0px" },
              }}
              rows={prevActive}
              columns={columns}
              columnHeaderHeight={40}
            />
          )}
        </MarketsTableAccordion>
      </Box>

      <Box id="never-active" ref={neverActiveRef}>
        <MarketsTableAccordion
          label={t("dashboard.markets.tables.borrower.closed.neverActive")}
          isLoading={isLoading}
          isOpen
          marketsLength={neverActive.length}
          nameFilter={filters.nameFilter}
          assetFilter={filters.assetFilter}
          statusFilter={filters.statusFilter}
          showNoFilteredMarkets
          noMarketsTitle={t("dashboard.markets.noMarkets.closed.title")}
          noMarketsSubtitle={t("dashboard.markets.noMarkets.closed.subtitle")}
          isMobile={mobileView}
        >
          {mobileView ? (
            <Box sx={{ padding: "12px" }}>{renderMarketCards(neverActive)}</Box>
          ) : (
            <DataGrid
              sx={{
                overflow: "auto",
                maxWidth: "100%",
                padding: "0 16px",
                "& .MuiDataGrid-columnHeader": { padding: 0 },
                "& .MuiDataGrid-cell": { padding: "0px" },
              }}
              rows={neverActive}
              columns={columns}
              columnHeaderHeight={40}
            />
          )}
        </MarketsTableAccordion>
      </Box>
    </Box>
  )
}
