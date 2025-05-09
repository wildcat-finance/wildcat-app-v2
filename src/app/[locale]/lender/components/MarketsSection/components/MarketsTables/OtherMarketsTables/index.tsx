import { useEffect, useRef } from "react"
import * as React from "react"

import { Box, Button, Typography } from "@mui/material"
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
import { MarketsTableAccordion } from "@/components/MarketsTableAccordion"
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

export type LenderOtherMarketsTableModel = {
  id: string
  status: ReturnType<typeof getMarketStatusChip>
  term: ReturnType<typeof getMarketTypeChip>
  name: string
  borrower: string | undefined
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

  const { data: borrowers } = useBorrowerNames()

  const rows: GridRowsProp<LenderOtherMarketsTableModel> = marketAccounts.map(
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
        debt: totalSupply,
        capacityLeft: maxTotalSupply.sub(totalSupply),
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
      pageSize: 20,
      page: 0,
    })

  const [manualPaginationModel, setManualPaginationModel] = React.useState({
    pageSize: 20,
    page: 0,
  })

  const { assetFilter, statusFilter, nameFilter } = filters

  useEffect(() => {
    setSelfOnboardPaginationModel((prevState) => ({ ...prevState, page: 0 }))
    setManualPaginationModel((prevState) => ({ ...prevState, page: 0 }))
  }, [assetFilter, statusFilter, nameFilter])

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
          <DataGrid
            sx={{
              overflow: "auto",
              maxWidth: "calc(100vw - 267px)",
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
          <DataGrid
            sx={{
              overflow: "auto",
              maxWidth: "calc(100vw - 267px)",
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
        </MarketsTableAccordion>
      </Box>
    </Box>
  )
}
