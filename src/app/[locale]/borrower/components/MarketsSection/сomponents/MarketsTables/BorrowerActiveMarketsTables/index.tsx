import * as React from "react"

import { Box, Button, Typography } from "@mui/material"
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
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketTypeChip } from "@/components/@extended/MarketTypeChip"
import {
  getAdsCellProps,
  getAdsTooltipComponent,
} from "@/components/AdsBanners/adsHelpers"
import { AprChip } from "@/components/AprChip"
import { MarketsTableAccordion } from "@/components/MarketsTableAccordion"
import { TotalDebtHeader } from "@/components/TotalDebtHeader"
import { useDefaultedMarkets } from "@/hooks/useDefaultedMarkets"
import { ROUTES } from "@/routes"
import { BorrowerMarketDashboardTabs } from "@/store/slices/borrowerDashboardSlice/borrowerDashboardSlice"
import {
  statusComparator,
  tokenAmountComparator,
  typeComparator,
} from "@/utils/comparators"
import {
  buildMarketHref,
  formatBps,
  formatSecsToHours,
  formatTokenWithCommas,
} from "@/utils/formatters"
import { getMarketTotalDebt } from "@/utils/marketDebt"
import { getMarketStatusChip, MarketStatus } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

export type BorrowerActiveMarketsTableModel = {
  id: string
  chainId: number
  status: ReturnType<typeof getMarketStatusChip>
  term: ReturnType<typeof getMarketTypeChip>
  name: string
  apr: number
  asset: string
  capacityLeft: TokenAmount
  debt: TokenAmount | undefined
  borrowable: TokenAmount
  withdrawalBatchDuration: number
  repay: boolean
}

export const BorrowerActiveMarketsTables = ({
  marketAccounts,
  isLoading,
  filters,
  tab,
}: MarketsTablesProps & {
  tab:
    | BorrowerMarketDashboardTabs.DEFAULTED
    | BorrowerMarketDashboardTabs.DEPOSITED
    | BorrowerMarketDashboardTabs.NON_DEPOSITED
}) => {
  const { t } = useTranslation()

  const { isDefaulted } = useDefaultedMarkets()

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

      const marketStatus = getMarketStatusChip(market, isDefaulted(address))
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
        debt: getMarketTotalDebt(market),
        capacityLeft: maxTotalSupply.sub(totalSupply),
        withdrawalBatchDuration,
        repay: !market.isClosed && market.outstandingDebt.gt(0),
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

  const isDefaultedTab = tab === BorrowerMarketDashboardTabs.DEFAULTED

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
        const adsComponent = getAdsTooltipComponent(
          params.row.chainId,
          params.row.id,
          formatBps(params.value),
        )
        const adsCellProps = getAdsCellProps(params.row.chainId, params.row.id)

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
              isBonus={!!adsCellProps}
              baseApr={formatBps(params.value)}
              icons={adsCellProps?.icons}
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
    isDefaultedTab
      ? {
          field: "capacityLeft",
          headerName: t("dashboard.markets.tables.header.capacity"),
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
              {params.value && params.value.gt(0)
                ? formatTokenWithCommas(params.value, {
                    withSymbol: false,
                    fractionDigits: 2,
                    compact: true,
                  })
                : "0"}
            </Link>
          ),
        }
      : {
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
                    compact: true,
                  })
                : "0"}
            </Link>
          ),
        },
    {
      field: "debt",
      headerName: t("dashboard.markets.tables.header.debt"),
      renderHeader: () => (
        <TotalDebtHeader label={t("dashboard.markets.tables.header.debt")} />
      ),
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
                compact: true,
              })
            : "0"}
        </Link>
      ),
    },
    ...(isDefaultedTab
      ? [
          {
            field: "repay",
            sortable: false,
            headerName: "",
            width: 96,
            headerAlign: "right",
            align: "right",
            renderCell: (params) => (
              <Link
                href={buildMarketHref(
                  params.row.id,
                  params.row.chainId,
                  ROUTES.borrower.market,
                )}
                style={{ ...LinkCell, justifyContent: "flex-end" }}
              >
                <Button
                  size="small"
                  variant="contained"
                  color="secondary"
                  disabled={!params.row.repay}
                >
                  {t("defaultedMarkets.repayButton")}
                </Button>
              </Link>
            ),
          } satisfies TypeSafeColDef<BorrowerActiveMarketsTableModel>,
        ]
      : []),
  ]

  const tabTables = {
    [BorrowerMarketDashboardTabs.DEFAULTED]: {
      label: t("defaultedMarkets.tab"),
      rows,
    },
    [BorrowerMarketDashboardTabs.DEPOSITED]: {
      label: t("dashboard.markets.tables.borrower.active.deposited"),
      rows: depositedMarkets,
    },
    [BorrowerMarketDashboardTabs.NON_DEPOSITED]: {
      label: t("dashboard.markets.tables.borrower.active.nonDeposited"),
      rows: nonDepositedMarkets,
    },
  }

  const { label: tabLabel, rows: tabMarkets } = tabTables[tab]

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: "1 1 0",
        minHeight: 0,
        width: "100%",
        overflow: "auto",
        overflowY: "auto",
        marginTop: "16px",
        paddingBottom: "26px",
      }}
    >
      <MarketsTableAccordion
        label={tabLabel}
        marketsLength={tabMarkets.length}
        isLoading={isLoading}
        isOpen
        hideSummary
        noMarketsTitle={
          isDefaultedTab
            ? t("defaultedMarkets.noMarkets.title")
            : t("dashboard.markets.noMarkets.active.title")
        }
        noMarketsSubtitle={
          isDefaultedTab
            ? t("defaultedMarkets.noMarkets.subtitle")
            : t("dashboard.markets.noMarkets.active.borrowerSubtitle")
        }
        nameFilter={filters.nameFilter}
        assetFilter={filters.assetFilter}
        statusFilter={filters.statusFilter}
        showNoFilteredMarkets
      >
        <DataGrid
          disableVirtualization
          sx={DataGridSx}
          getRowHeight={
            tab === BorrowerMarketDashboardTabs.NON_DEPOSITED
              ? () => "auto"
              : undefined
          }
          rows={tabMarkets}
          columns={columns}
          columnHeaderHeight={40}
        />
      </MarketsTableAccordion>
    </Box>
  )
}
