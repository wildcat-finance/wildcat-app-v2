import { useEffect, useRef } from "react"
import * as React from "react"

import { Box, Button, Typography, useMediaQuery } from "@mui/material"
import { DataGrid, GridRenderCellParams, GridRowsProp } from "@mui/x-data-grid"
import { MarketAccount, TokenAmount } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { TypeSafeColDef } from "@/app/[locale]/borrower/components/MarketsSection/сomponents/MarketsTables/interface"
import { MarketsTableModel } from "@/app/[locale]/borrower/components/MarketsTables/interface"
import { LinkCell } from "@/app/[locale]/borrower/components/MarketsTables/style"
import { BorrowerWithName } from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import { MobileMarketList } from "@/app/[locale]/lender/components/mobile/MobileMarketList"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { BorrowerProfileChip } from "@/components/BorrowerProfileChip"
import { MarketsTableAccordion } from "@/components/MarketsTableAccordion"
import { SmallFilterSelectItem } from "@/components/SmallFilterSelect"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { ROUTES } from "@/routes"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setScrollTarget } from "@/store/slices/lenderDashboardSlice/lenderDashboardSlice"
import { COLORS } from "@/theme/colors"
import { lh, pxToRem } from "@/theme/units"
import { statusComparator, tokenAmountComparator } from "@/utils/comparators"
import { pageCalcHeights } from "@/utils/constants"
import {
  formatBps,
  formatSecsToHours,
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
  borrowerAddress: string | undefined
  asset: string
  debt: TokenAmount | undefined
  loan: TokenAmount | undefined
  apr: number
  withdrawalBatchDuration: number
  hasEverInteracted: boolean
  button?: string
  hasTokens?: boolean
}

export const LenderTerminatedMarketsTables = ({
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
  const isMobile = useMobileResolution()
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const scrollTargetId = useAppSelector(
    (state) => state.lenderDashboard.scrollTarget,
  )

  const prevActiveRef = useRef<HTMLDivElement>(null)
  const neverActiveRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isMobile) {
      if (scrollTargetId === "prev-active" && prevActiveRef.current) {
        prevActiveRef.current.scrollIntoView({ behavior: "smooth" })
        dispatch(setScrollTarget(null))
      }
      if (scrollTargetId === "never-active" && neverActiveRef.current) {
        neverActiveRef.current.scrollIntoView({ behavior: "smooth" })
        dispatch(setScrollTarget(null))
      }
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
        totalSupply,
        withdrawalBatchDuration,
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
        withdrawalBatchDuration,
        loan: marketBalance,
        debt: totalSupply,
        hasEverInteracted: account.hasEverInteracted,
      }
    })

  const prevActive = rows.filter((market) => market.hasEverInteracted)

  const neverActive = rows.filter((market) => !market.hasEverInteracted)

  const columns: TypeSafeColDef<LenderTerminatedMarketsTableModel>[] = [
    {
      field: "name",
      headerName: t("dashboard.markets.tables.header.name"),
      flex: 0.5,
      minWidth: 196,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <Link
          href={`${ROUTES.lender.market}/${params.row.id}`}
          style={{
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

          <Link
            href={`${ROUTES.lender.profile}/${params.row.borrowerAddress}`}
            style={{ display: "flex", textDecoration: "none" }}
          >
            <BorrowerProfileChip borrower={params.row.borrower} />
          </Link>
        </Link>
      ),
    },
    {
      field: "status",
      headerName: t("dashboard.markets.tables.header.status"),
      minWidth: 104,
      flex: 0.4,
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
          <Box width="120px">
            <MarketStatusChip status={params.value} />
          </Box>
        </Link>
      ),
    },
    {
      field: "asset",
      headerName: t("dashboard.markets.tables.header.asset"),
      minWidth: 212,
      flex: 1.7,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => (
        <Link
          href={`${ROUTES.lender.market}/${params.row.id}`}
          style={{
            ...LinkCell,
            justifyContent: "flex-end",
          }}
        >
          {params.value}
        </Link>
      ),
    },
    {
      field: "debt",
      headerName: t("dashboard.markets.tables.header.debt"),
      minWidth: 112,
      flex: 0.5,
      headerAlign: "right",
      align: "right",
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
      minWidth: 112,
      flex: 0.5,
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
      field: "withdrawalBatchDuration",
      headerName: t("dashboard.markets.tables.header.withdrawal"),
      minWidth: 112,
      flex: 0.5,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => (
        <Link
          href={`${ROUTES.lender.market}/${params.row.id}`}
          style={{
            ...LinkCell,
            justifyContent: "flex-end",
          }}
        >
          {formatSecsToHours(params.value, true)}
        </Link>
      ),
    },
    {
      sortable: false,
      field: "button",
      headerName: "",
      minWidth: 112,
      flex: 0.5,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => (
        <Link
          href={`${ROUTES.lender.market}/${params.row.id}`}
          style={{ ...LinkCell, justifyContent: "flex-end" }}
        >
          <Button
            size="small"
            variant="contained"
            color="secondary"
            disabled={!params.row.hasEverInteracted}
          >
            Withdraw
          </Button>
        </Link>
      ),
    },
  ]

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
        >
          <DataGrid
            sx={{
              overflow: "auto",
              maxWidth: "calc(100vw - 267px)",
              padding: "0 16px",
              "& .MuiDataGrid-columnHeader": { padding: 0 },
              "& .MuiDataGrid-row": {
                minHeight: "66px !important",
                maxHeight: "66px !important",
              },
              "& .MuiDataGrid-cell": {
                padding: "0px",
                minHeight: "66px",
                height: "auto",
              },
            }}
            getRowHeight={() => "auto"}
            rows={prevActive}
            columns={columns}
            columnHeaderHeight={40}
          />
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
        >
          <DataGrid
            sx={{
              overflow: "auto",
              maxWidth: "calc(100vw - 267px)",
              padding: "0 16px",
              "& .MuiDataGrid-columnHeader": { padding: 0 },
              "& .MuiDataGrid-row": {
                minHeight: "66px !important",
                maxHeight: "66px !important",
              },
              "& .MuiDataGrid-cell": {
                padding: "0px",
                minHeight: "66px",
                height: "auto",
              },
            }}
            getRowHeight={() => "auto"}
            rows={neverActive}
            columns={columns}
            columnHeaderHeight={40}
          />
        </MarketsTableAccordion>
      </Box>
    </Box>
  )
}
