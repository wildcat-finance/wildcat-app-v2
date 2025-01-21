import * as React from "react"
import { useEffect, useRef } from "react"

import { Box, Button, Typography } from "@mui/material"
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridRowsProp,
} from "@mui/x-data-grid"
import {
  DepositStatus,
  Market,
  MarketAccount,
  MarketVersion,
  TokenAmount,
} from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import {
  MarketsTablesProps,
  TypeSafeColDef,
} from "@/app/[locale]/borrower/components/MarketsSection/сomponents/MarketsTables/interface"
import { MarketsTableModel } from "@/app/[locale]/borrower/components/MarketsTables/interface"
import { LinkCell } from "@/app/[locale]/borrower/components/MarketsTables/style"
import { BorrowerWithName } from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketTypeChip } from "@/components/@extended/MarketTypeChip"
import { MarketsTableAccordion } from "@/components/MarketsTableAccordion"
import { SmallFilterSelectItem } from "@/components/SmallFilterSelect"
import { ROUTES } from "@/routes"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setScrollTarget } from "@/store/slices/marketsOverviewSidebarSlice/marketsOverviewSidebarSlice"
import { COLORS } from "@/theme/colors"
import {
  statusComparator,
  tokenAmountComparator,
  typeComparator,
} from "@/utils/comparators"
import {
  formatBps,
  formatTokenWithCommas,
  trimAddress,
} from "@/utils/formatters"
import { getMarketStatusChip, MarketStatus } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

export type LenderActiveMarketsTableModel = {
  id: string
  status: ReturnType<typeof getMarketStatusChip>
  term: ReturnType<typeof getMarketTypeChip>
  name: string
  borrower: string | undefined
  asset: string
  debt: TokenAmount | undefined
  loan: TokenAmount | undefined
  apr: number
  hasEverInteracted: boolean
}

export const LenderActiveMarketsTables = ({
  marketAccounts,
  borrowers,
  isLoading,
  filters,
}: {
  marketAccounts: MarketAccount[]
  borrowers: BorrowerWithName[]
  isLoading: boolean
  filters: {
    nameFilter: string
    assetFilter: SmallFilterSelectItem[]
    statusFilter: MarketStatus[]
  }
}) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const scrollTargetId = useAppSelector(
    (state) => state.lenderDashboard.scrollTarget,
  )

  const depositedRef = useRef<HTMLDivElement>(null)
  const nonDepositedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollTargetId === "deposited" && depositedRef.current) {
      depositedRef.current.scrollIntoView({ behavior: "smooth" })
      dispatch(setScrollTarget(null))
    }
    if (scrollTargetId === "non-deposited" && nonDepositedRef.current) {
      nonDepositedRef.current.scrollIntoView({ behavior: "smooth" })
      dispatch(setScrollTarget(null))
    }
  }, [scrollTargetId])

  const rows: GridRowsProp<LenderActiveMarketsTableModel> = marketAccounts.map(
    (account) => {
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
        ? borrower.name
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
        hasEverInteracted,
      }
    },
  )

  const depositedMarkets = rows.filter((market) => market.hasEverInteracted)

  const nonDepositedMarkets = rows.filter((market) => !market.hasEverInteracted)

  const columns: TypeSafeColDef<LenderActiveMarketsTableModel>[] = [
    {
      field: "status",
      headerName: "Status",
      minWidth: 120,
      flex: 0.7,
      headerAlign: "left",
      align: "left",
      sortComparator: statusComparator,
      renderCell: (params) => (
        <Link
          href={`${ROUTES.borrower.market}/${params.row.id}`}
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
      headerName: "Term",
      minWidth: 170,
      flex: 1,
      headerAlign: "left",
      align: "left",
      sortComparator: typeComparator,
      renderCell: (params) => (
        <Link
          href={`${ROUTES.borrower.market}/${params.row.id}`}
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
      headerName: "Market Name",
      flex: 3,
      minWidth: 208,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <Link
          href={`${ROUTES.borrower.market}/${params.row.id}`}
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
          Borrower Name
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
      headerName: "Asset",
      minWidth: 95,
      headerAlign: "right",
      align: "right",
      flex: 1,
      renderCell: (params) => (
        <Link
          href={`${ROUTES.borrower.market}/${params.row.id}`}
          style={{ ...LinkCell, justifyContent: "flex-end" }}
        >
          {params.value}
        </Link>
      ),
    },
    {
      field: "debt",
      headerName: "Total Debt",
      minWidth: 110,
      headerAlign: "right",
      align: "right",
      flex: 1.5,
      sortComparator: tokenAmountComparator,
      renderCell: (params) => (
        <Link
          href={`${ROUTES.borrower.market}/${params.row.id}`}
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
      headerName: "My Loan",
      minWidth: 106,
      flex: 1.6,
      headerAlign: "right",
      align: "right",
      sortComparator: tokenAmountComparator,
      renderCell: (
        params: GridRenderCellParams<MarketsTableModel, TokenAmount>,
      ) => (
        <Link
          href={`${ROUTES.borrower.market}/${params.row.id}`}
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
      headerName: "APR",
      minWidth: 102,
      flex: 1,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => (
        <Link
          href={`${ROUTES.borrower.market}/${params.row.id}`}
          style={{ ...LinkCell, justifyContent: "flex-end" }}
        >
          {`${formatBps(params.value)}%`}
        </Link>
      ),
    },
  ]

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 43px - 52px - 52px - 110px - 36px)",
        width: "100%",
        overflow: "auto",
        overflowY: "auto",
        gap: "16px",
        marginTop: "24px",
        paddingBottom: "26px",
      }}
    >
      <Box id="deposited" ref={depositedRef}>
        <MarketsTableAccordion
          label="Deposited"
          marketsLength={depositedMarkets.length}
          isLoading={isLoading}
          isOpen
          noMarketsTitle={t("borrowerMarketList.table.noMarkets.active.title")}
          noMarketsSubtitle={t(
            "borrowerMarketList.table.noMarkets.active.subtitle",
          )}
          nameFilter={filters.nameFilter}
          assetFilter={filters.assetFilter}
          statusFilter={filters.statusFilter}
          showNoFilteredMarkets
        >
          <DataGrid
            sx={{
              overflow: "auto",
              maxWidth: "calc(100vw - 267px)",
              padding: "0 16px",
              "& .MuiDataGrid-columnHeader": { padding: 0 },
              "& .MuiDataGrid-cell": { padding: "0px" },
            }}
            rows={depositedMarkets}
            columns={columns}
            columnHeaderHeight={40}
          />
        </MarketsTableAccordion>
      </Box>

      <Box id="non-deposited" ref={nonDepositedRef}>
        <MarketsTableAccordion
          label="Non-Deposited"
          isLoading={isLoading}
          isOpen
          noMarketsTitle={t("borrowerMarketList.table.noMarkets.active.title")}
          noMarketsSubtitle={t(
            "borrowerMarketList.table.noMarkets.active.subtitle",
          )}
          marketsLength={nonDepositedMarkets.length}
          nameFilter={filters.nameFilter}
          assetFilter={filters.assetFilter}
          statusFilter={filters.statusFilter}
          showNoFilteredMarkets
        >
          <DataGrid
            sx={{
              overflow: "auto",
              maxWidth: "calc(100vw - 267px)",
              padding: "0 16px",
              "& .MuiDataGrid-columnHeader": { padding: 0 },
              "& .MuiDataGrid-cell": { padding: "0px" },
            }}
            rows={nonDepositedMarkets}
            columns={columns}
            columnHeaderHeight={40}
          />
        </MarketsTableAccordion>
      </Box>
    </Box>
  )
}
