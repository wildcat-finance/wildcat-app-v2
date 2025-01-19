import * as React from "react"
import { useEffect, useRef } from "react"

import { Box } from "@mui/material"
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridRowsProp,
} from "@mui/x-data-grid"
import { Market, TokenAmount } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { MarketsTableModel } from "@/app/[locale]/borrower/components/MarketsTables/interface"
import { LinkCell } from "@/app/[locale]/borrower/components/MarketsTables/style"
import { MarketsTableAccordion } from "@/app/[locale]/new-borrower/components/MarketsSection/сomponents/MarketsTableAccordion"
import {
  BorrowerMarketsTablesType,
  TypeSafeColDef,
} from "@/app/[locale]/new-borrower/components/MarketsSection/сomponents/MarketsTables/interface"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketTypeChip } from "@/components/@extended/MarketTypeChip"
import { ROUTES } from "@/routes"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setScrollTarget } from "@/store/slices/marketsOverviewSidebarSlice/marketsOverviewSidebarSlice"
import {
  statusComparator,
  tokenAmountComparator,
  typeComparator,
} from "@/utils/comparators"
import { formatBps, formatTokenWithCommas } from "@/utils/formatters"
import { getMarketStatusChip, MarketStatus } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

export type BorrowerActiveMarketsTableModel = {
  id: string
  status: ReturnType<typeof getMarketStatusChip>
  term: ReturnType<typeof getMarketTypeChip>
  name: string
  asset: string
  apr: number
  debt: TokenAmount | undefined
  borrowable: TokenAmount
}

export const BorrowerActiveMarketsTables = ({
  markets,
  isLoading,
}: BorrowerMarketsTablesType) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const scrollTargetId = useAppSelector(
    (state) => state.borrowerDashboard.scrollTarget,
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

  const rows: GridRowsProp<BorrowerActiveMarketsTableModel> = markets.map(
    (market) => {
      const {
        address,
        name,
        underlyingToken,
        annualInterestBips,
        borrowableAssets,
        totalBorrowed,
      } = market

      const marketStatus = getMarketStatusChip(market)
      const marketType = getMarketTypeChip(market)

      return {
        id: address,
        status: marketStatus,
        term: marketType,
        name,
        asset: underlyingToken.symbol,
        apr: annualInterestBips,
        borrowable: borrowableAssets,
        debt: totalBorrowed,
      }
    },
  )

  const depositedMarkets = rows.filter(
    (market) => !market.borrowable.raw.isZero() || !market.debt?.raw.isZero(),
  )

  const nonDepositedMarkets = rows.filter(
    (market) =>
      market.borrowable.raw.isZero() &&
      market.status.status === MarketStatus.HEALTHY,
  )

  const columns: TypeSafeColDef<BorrowerActiveMarketsTableModel>[] = [
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
      field: "borrowable",
      headerName: t("borrowerMarketList.table.header.borrowable"),
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
          marketsLength={nonDepositedMarkets.length}
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
