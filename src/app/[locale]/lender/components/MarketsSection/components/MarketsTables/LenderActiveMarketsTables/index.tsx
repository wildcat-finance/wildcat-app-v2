import * as React from "react"
import { useEffect, useRef } from "react"

import { Box, Button, Typography, useMediaQuery } from "@mui/material"
import { DataGrid, GridRenderCellParams, GridRowsProp } from "@mui/x-data-grid"
import { MarketAccount, TokenAmount } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { TypeSafeColDef } from "@/app/[locale]/borrower/components/MarketsSection/сomponents/MarketsTables/interface"
import { MarketsTableModel } from "@/app/[locale]/borrower/components/MarketsTables/interface"
import { LinkCell } from "@/app/[locale]/borrower/components/MarketsTables/style"
import { BorrowerWithName } from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import { MobileMarketCard } from "@/app/[locale]/lender/components/mobile/MobileMarketCard"
import { MobileMarketList } from "@/app/[locale]/lender/components/mobile/MobileMarketList"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketTypeChip } from "@/components/@extended/MarketTypeChip"
import { MarketsTableAccordion } from "@/components/MarketsTableAccordion"
import { SmallFilterSelectItem } from "@/components/SmallFilterSelect"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { ROUTES } from "@/routes"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { LenderMarketDashboardSections } from "@/store/slices/lenderDashboardSlice/lenderDashboardSlice"
import { setScrollTarget } from "@/store/slices/marketsOverviewSidebarSlice/marketsOverviewSidebarSlice"
import { COLORS } from "@/theme/colors"
import { theme } from "@/theme/theme"
import { lh, pxToRem } from "@/theme/units"
import {
  statusComparator,
  tokenAmountComparator,
  typeComparator,
} from "@/utils/comparators"
import { pageCalcHeights } from "@/utils/constants"
import {
  formatBps,
  formatSecsToHours,
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
  borrowerAddress: string | undefined
  asset: string
  debt: TokenAmount | undefined
  loan: TokenAmount | undefined
  apr: number
  withdrawalBatchDuration: number
  capacityLeft: TokenAmount
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
  const isMobile = useMobileResolution()
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const scrollTargetId = useAppSelector(
    (state) => state.lenderDashboard.scrollTarget,
  )

  const depositedRef = useRef<HTMLDivElement>(null)
  const nonDepositedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isMobile) {
      if (scrollTargetId === "deposited" && depositedRef.current) {
        depositedRef.current.scrollIntoView({ behavior: "smooth" })
        dispatch(setScrollTarget(null))
      }
      if (scrollTargetId === "non-deposited" && nonDepositedRef.current) {
        nonDepositedRef.current.scrollIntoView({ behavior: "smooth" })
        dispatch(setScrollTarget(null))
      }
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
        maxTotalSupply,
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
        capacityLeft: maxTotalSupply.sub(totalSupply),
        hasEverInteracted,
      }
    },
  )

  const depositedMarkets = rows.filter((market) => market.hasEverInteracted)

  const nonDepositedMarkets = rows.filter((market) => !market.hasEverInteracted)

  const columns: TypeSafeColDef<LenderActiveMarketsTableModel>[] = [
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
          <Box width="120px">
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
              textDecoration: "none",
              width: "100%",
              height: "fit-content",
            }}
          >
            <Button
              size="small"
              variant="text"
              sx={{
                fontSize: pxToRem(13),
                lineHeight: lh(20, 13),
                fontWeight: 500,
                minWidth: "calc(100% - 1px)",
                width: "calc(100% - 1px)",
                textAlign: "left",
                textOverflow: "ellipsis",
                overflow: "hidden",
                whiteSpace: "nowrap",
                display: "inline-block",

                "&:hover": {
                  boxShadow: "none",
                  backgroundColor: COLORS.whiteSmoke,
                  color: COLORS.blackRock,
                },
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
      field: "withdrawalBatchDuration",
      headerName: t("dashboard.markets.tables.header.withdrawal"),
      minWidth: 110,
      flex: 1,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => (
        <Link
          href={`${ROUTES.lender.market}/${params.row.id}`}
          style={{
            ...LinkCell,
            justifyContent: "flex-end",
            textTransform: "capitalize",
          }}
        >
          {formatSecsToHours(params.value, true)}
        </Link>
      ),
    },
    {
      field: "asset",
      headerName: t("dashboard.markets.tables.header.asset"),
      minWidth: 95,
      headerAlign: "right",
      align: "right",
      flex: 0.6,
      renderCell: (params) => (
        <Link
          href={`${ROUTES.lender.market}/${params.row.id}`}
          style={{
            ...LinkCell,
            justifyContent: "flex-end",
            paddingRight: "16px",
          }}
        >
          {params.value}
        </Link>
      ),
    },
    {
      field: "capacityLeft",
      headerName: "Remaining",
      minWidth: 110,
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
      minWidth: 120,
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
      minWidth: 120,
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
  ]

  if (isMobile)
    return (
      <>
        {scrollTargetId === "deposited" && (
          <MobileMarketList markets={depositedMarkets} isLoading={isLoading} />
        )}
        {scrollTargetId === "non-deposited" && (
          <MobileMarketList
            markets={nonDepositedMarkets}
            isLoading={isLoading}
          />
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
      <Box id="deposited" ref={depositedRef}>
        <MarketsTableAccordion
          label={t("dashboard.markets.tables.borrower.active.deposited")}
          marketsLength={depositedMarkets.length}
          isLoading={isLoading}
          isOpen
          noMarketsTitle={t("dashboard.markets.noMarkets.active.title")}
          noMarketsSubtitle={t(
            "dashboard.markets.noMarkets.active.lenderSubtitle",
          )}
          nameFilter={filters.nameFilter}
          assetFilter={filters.assetFilter}
          statusFilter={filters.statusFilter}
          showNoFilteredMarkets
        >
          {isMobile ? (
            <Box display="flex" flexDirection="column">
              {depositedMarkets.map((marketItem) => (
                <MobileMarketCard
                  marketItem={marketItem}
                  buttonText="Deposit"
                  buttonIcon
                />
              ))}
            </Box>
          ) : (
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
          )}
        </MarketsTableAccordion>
      </Box>

      <Box id="non-deposited" ref={nonDepositedRef}>
        <MarketsTableAccordion
          label={t("dashboard.markets.tables.borrower.active.nonDeposited")}
          isLoading={isLoading}
          isOpen
          noMarketsTitle={t("dashboard.markets.noMarkets.active.title")}
          noMarketsSubtitle={t(
            "dashboard.markets.noMarkets.active.lenderSubtitle",
          )}
          marketsLength={nonDepositedMarkets.length}
          nameFilter={filters.nameFilter}
          assetFilter={filters.assetFilter}
          statusFilter={filters.statusFilter}
          showNoFilteredMarkets
        >
          {isMobile ? (
            <Box display="flex" flexDirection="column">
              {nonDepositedMarkets.map((marketItem) => (
                <MobileMarketCard
                  marketItem={marketItem}
                  buttonText="Deposit"
                  buttonIcon
                />
              ))}
            </Box>
          ) : (
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
          )}
        </MarketsTableAccordion>
      </Box>
    </Box>
  )
}
