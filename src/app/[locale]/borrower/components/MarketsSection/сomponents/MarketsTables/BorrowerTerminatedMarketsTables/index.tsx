import { useEffect, useRef } from "react"
import * as React from "react"

import { Box, Typography } from "@mui/material"
import { DataGrid, GridRowsProp } from "@mui/x-data-grid"
import { MarketAccount, TokenAmount } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import {
  MarketsTablesProps,
  TypeSafeColDef,
} from "@/app/[locale]/borrower/components/MarketsSection/сomponents/MarketsTables/interface"
import { LinkCell } from "@/app/[locale]/borrower/components/MarketsTables/style"
import Ethena from "@/assets/companies-icons/ethena_icon.svg"
import Ethereal from "@/assets/companies-icons/ethereal_icon.svg"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { AurosEthenaBanner } from "@/components/AdsBanners/AurosEthena/AurosEthenaBanner"
import { AurosEthenaProposalChip } from "@/components/AdsBanners/AurosEthena/AurosEthenaProposalChip"
import { AprTooltip } from "@/components/AdsBanners/Common/AprTooltip"
import { AprChip } from "@/components/AprChip"
import { BorrowerProfileChip } from "@/components/BorrowerProfileChip"
import { ROUTES } from "@/routes"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setScrollTarget } from "@/store/slices/marketsOverviewSidebarSlice/marketsOverviewSidebarSlice"
import { COLORS } from "@/theme/colors"
import { statusComparator, tokenAmountComparator } from "@/utils/comparators"
import { AUROS_ETHENA_ADDRESS, pageCalcHeights } from "@/utils/constants"
import {
  formatBps,
  formatSecsToHours,
  formatTokenWithCommas,
} from "@/utils/formatters"
import { getMarketStatusChip, MarketStatus } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

import { MarketsTableAccordion } from "../../../../../../../../components/MarketsTableAccordion"

export type BorrowerTerminatedMarketsTableModel = {
  id: string
  status: ReturnType<typeof getMarketStatusChip>
  term: ReturnType<typeof getMarketTypeChip>
  name: string
  asset: string
  apr: number
  debt: TokenAmount | undefined
  borrowable: TokenAmount
  withdrawalBatchDuration: number
  hasEverInteracted: boolean
}

export const BorrowerTerminatedMarketsTables = ({
  marketAccounts,
  isLoading,
  filters,
}: MarketsTablesProps) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const scrollTargetId = useAppSelector(
    (state) => state.borrowerDashboard.scrollTarget,
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

  const rows: GridRowsProp<BorrowerTerminatedMarketsTableModel> =
    marketAccounts.map((account) => {
      const { market } = account

      const {
        address,
        name,
        underlyingToken,
        annualInterestBips,
        borrowableAssets,
        totalSupply,
        withdrawalBatchDuration,
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
        debt: totalSupply,
        withdrawalBatchDuration,
        hasEverInteracted: account.hasEverInteracted,
      }
    })

  const prevActive = rows.filter((market) => market.hasEverInteracted)

  const neverActive = rows.filter((market) => !market.hasEverInteracted)

  const columns: TypeSafeColDef<BorrowerTerminatedMarketsTableModel>[] = [
    {
      field: "name",
      headerName: t("dashboard.markets.tables.header.name"),
      flex: 2,
      minWidth: 200,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <Link
          href={`${ROUTES.borrower.market}/${params.row.id}`}
          style={{
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
        </Link>
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
        <Link
          href={`${ROUTES.borrower.market}/${params.row.id}`}
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
      minWidth: 200,
      flex: 2,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => (
        <Link
          href={`${ROUTES.borrower.market}/${params.row.id}`}
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
      field: "apr",
      headerName: t("dashboard.markets.tables.header.apr"),
      minWidth: 100,
      flex: 1,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => {
        const isAurosTestnet =
          params.row.id.toLowerCase() ===
          AUROS_ETHENA_ADDRESS.testnet.toLowerCase()
        const isAurosMainnet =
          params.row.id.toLowerCase() ===
          AUROS_ETHENA_ADDRESS.mainnet.toLowerCase()

        const isAuros = isAurosTestnet || isAurosMainnet

        const adsComponent = isAuros ? (
          <AprTooltip
            baseAPR={formatBps(params.value)}
            aprProposal={<AurosEthenaProposalChip isTooltip />}
            banner={<AurosEthenaBanner />}
            withdrawalAnyTime
          />
        ) : undefined

        return (
          <Link
            href={`${ROUTES.borrower.market}/${params.row.id}`}
            style={{ ...LinkCell, justifyContent: "flex-end" }}
          >
            <AprChip
              isBonus={isAuros}
              baseApr={formatBps(params.value)}
              icons={isAuros ? [<Ethena />, <Ethereal />] : undefined}
              adsComponent={adsComponent}
            />
          </Link>
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
        <Link
          href={`${ROUTES.borrower.market}/${params.row.id}`}
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
      field: "debt",
      headerName: t("dashboard.markets.tables.header.debt"),
      minWidth: 100,
      flex: 1,
      headerAlign: "right",
      align: "right",
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
  ]

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
              "& .MuiDataGrid-cell": { padding: "0px" },
            }}
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
              "& .MuiDataGrid-cell": { padding: "0px" },
            }}
            rows={neverActive}
            columns={columns}
            columnHeaderHeight={40}
          />
        </MarketsTableAccordion>
      </Box>
    </Box>
  )
}
