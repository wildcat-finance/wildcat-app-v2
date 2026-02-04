import * as React from "react"
import { useEffect, useRef } from "react"

import { Box, Typography } from "@mui/material"
import { DataGrid, GridRenderCellParams, GridRowsProp } from "@mui/x-data-grid"
import { TokenAmount } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import {
  MarketsTablesProps,
  TypeSafeColDef,
} from "@/app/[locale]/borrower/components/MarketsSection/сomponents/MarketsTables/interface"
import { DataGridSx } from "@/app/[locale]/borrower/components/MarketsSection/сomponents/MarketsTables/style"
import { LinkCell } from "@/app/[locale]/borrower/components/MarketsTables/style"
import Ethena from "@/assets/companies-icons/ethena_icon.svg"
import Ethereal from "@/assets/companies-icons/ethereal_icon.svg"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketTypeChip } from "@/components/@extended/MarketTypeChip"
import { AurosEthenaBanner } from "@/components/AdsBanners/AurosEthena/AurosEthenaBanner"
import { AurosEthenaProposalChip } from "@/components/AdsBanners/AurosEthena/AurosEthenaProposalChip"
import { AprTooltip } from "@/components/AdsBanners/Common/AprTooltip"
import { AprChip } from "@/components/AprChip"
import { MarketsTableAccordion } from "@/components/MarketsTableAccordion"
import { ROUTES } from "@/routes"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setScrollTarget } from "@/store/slices/marketsOverviewSidebarSlice/marketsOverviewSidebarSlice"
import {
  statusComparator,
  tokenAmountComparator,
  typeComparator,
} from "@/utils/comparators"
import { AUROS_ETHENA_ADDRESS, pageCalcHeights } from "@/utils/constants"
import {
  buildMarketHref,
  formatBps,
  formatSecsToHours,
  formatTokenWithCommas,
} from "@/utils/formatters"
import { getMarketStatusChip, MarketStatus } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

import { MarketsTableModel } from "../../../../MarketsTables/interface"

export type BorrowerActiveMarketsTableModel = {
  id: string
  chainId?: number
  status: ReturnType<typeof getMarketStatusChip>
  term: ReturnType<typeof getMarketTypeChip>
  name: string
  apr: number
  asset: string
  capacityLeft: TokenAmount
  debt: TokenAmount | undefined
  borrowable: TokenAmount
  withdrawalBatchDuration: number
}

export const BorrowerActiveMarketsTables = ({
  marketAccounts,
  isLoading,
  filters,
}: MarketsTablesProps) => {
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

  const rows: GridRowsProp<BorrowerActiveMarketsTableModel> =
    marketAccounts.map((account) => {
      const { market } = account

      const {
        address,
        name,
        underlyingToken,
        annualInterestBips,
        borrowableAssets,
        maxTotalSupply,
        totalSupply,
        withdrawalBatchDuration,
        chainId,
      } = market

      const marketStatus = getMarketStatusChip(market)
      const marketType = getMarketTypeChip(market)

      return {
        id: address,
        chainId,
        status: marketStatus,
        term: marketType,
        name,
        asset: underlyingToken.symbol,
        apr: annualInterestBips,
        borrowable: borrowableAssets,
        debt: totalSupply,
        capacityLeft: maxTotalSupply.sub(totalSupply),
        withdrawalBatchDuration,
      }
    })

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
      field: "name",
      headerName: t("dashboard.markets.tables.header.name"),
      flex: 2,
      minWidth: 200,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <Link
          href={buildMarketHref(
            params.row.id,
            params.row.chainId,
            ROUTES.borrower.market,
          )}
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
          href={buildMarketHref(
            params.row.id,
            params.row.chainId,
            ROUTES.borrower.market,
          )}
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
      minWidth: 100,
      flex: 1,
      headerAlign: "left",
      align: "left",
      sortComparator: typeComparator,
      renderCell: (params) => (
        <Link
          href={buildMarketHref(
            params.row.id,
            params.row.chainId,
            ROUTES.borrower.market,
          )}
          style={{
            ...LinkCell,
            justifyContent: "flex-start",
          }}
        >
          <Box minWidth="170px">
            <MarketTypeChip type="table" {...params.value} />
          </Box>
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
            href={buildMarketHref(
              params.row.id,
              params.row.chainId,
              ROUTES.borrower.market,
            )}
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
      field: "asset",
      headerName: t("dashboard.markets.tables.header.asset"),
      minWidth: 100,
      flex: 1,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => (
        <Link
          href={buildMarketHref(
            params.row.id,
            params.row.chainId,
            ROUTES.borrower.market,
          )}
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
      field: "withdrawalBatchDuration",
      headerName: t("dashboard.markets.tables.header.withdrawal"),
      minWidth: 100,
      flex: 1,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => (
        <Link
          href={buildMarketHref(
            params.row.id,
            params.row.chainId,
            ROUTES.borrower.market,
          )}
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
      field: "borrowable",
      headerName: t("dashboard.markets.tables.header.borrowable"),
      minWidth: 100,
      flex: 1,
      headerAlign: "right",
      align: "right",
      sortComparator: tokenAmountComparator,
      renderCell: (
        params: GridRenderCellParams<
          BorrowerActiveMarketsTableModel,
          TokenAmount
        >,
      ) => (
        <Link
          href={buildMarketHref(
            params.row.id,
            params.row.chainId,
            ROUTES.borrower.market,
          )}
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
      field: "debt",
      headerName: t("dashboard.markets.tables.header.debt"),
      minWidth: 100,
      flex: 1,
      headerAlign: "right",
      align: "right",
      sortComparator: tokenAmountComparator,
      renderCell: (params) => (
        <Link
          href={buildMarketHref(
            params.row.id,
            params.row.chainId,
            ROUTES.borrower.market,
          )}
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
      <Box id="deposited" ref={depositedRef}>
        <MarketsTableAccordion
          label={t("dashboard.markets.tables.borrower.active.deposited")}
          marketsLength={depositedMarkets.length}
          isLoading={isLoading}
          isOpen
          noMarketsTitle={t("dashboard.markets.noMarkets.active.title")}
          noMarketsSubtitle={t(
            "dashboard.markets.noMarkets.active.borrowerSubtitle",
          )}
          nameFilter={filters.nameFilter}
          assetFilter={filters.assetFilter}
          statusFilter={filters.statusFilter}
          showNoFilteredMarkets
        >
          <DataGrid
            sx={DataGridSx}
            rows={depositedMarkets}
            columns={columns}
            columnHeaderHeight={40}
          />
        </MarketsTableAccordion>
      </Box>

      <Box id="non-deposited" ref={nonDepositedRef}>
        <MarketsTableAccordion
          label={t("dashboard.markets.tables.borrower.active.nonDeposited")}
          isLoading={isLoading}
          isOpen
          noMarketsTitle={t("dashboard.markets.noMarkets.active.title")}
          noMarketsSubtitle={t(
            "dashboard.markets.noMarkets.active.borrowerSubtitle",
          )}
          marketsLength={nonDepositedMarkets.length}
          nameFilter={filters.nameFilter}
          assetFilter={filters.assetFilter}
          statusFilter={filters.statusFilter}
          showNoFilteredMarkets
        >
          <DataGrid
            sx={DataGridSx}
            getRowHeight={() => "auto"}
            rows={nonDepositedMarkets}
            columns={columns}
            columnHeaderHeight={40}
          />
        </MarketsTableAccordion>
      </Box>
    </Box>
  )
}
