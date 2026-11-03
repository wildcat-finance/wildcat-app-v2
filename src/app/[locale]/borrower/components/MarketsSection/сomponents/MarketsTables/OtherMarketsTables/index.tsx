import { useEffect } from "react"
import * as React from "react"

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
import { useBorrowerNames } from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketTypeChip } from "@/components/@extended/MarketTypeChip"
import {
  getAdsCellProps,
  getAdsTooltipComponent,
} from "@/components/AdsBanners/adsHelpers"
import { AprChip } from "@/components/AprChip"
import { BorrowerProfileChip } from "@/components/BorrowerProfileChip"
import { MarketsTableAccordion } from "@/components/MarketsTableAccordion"
import { TablePagination } from "@/components/TablePagination"
import { TotalDebtHeader } from "@/components/TotalDebtHeader"
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
  trimAddress,
} from "@/utils/formatters"
import { getMarketTotalDebt } from "@/utils/marketDebt"
import {
  getKnownMarketOnboardingMode,
  MarketOnboardingByAddress,
  MarketOnboardingMode,
} from "@/utils/marketOnboarding"
import { getMarketStatusChip } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

export type OtherMarketsTableModel = {
  id: string
  chainId: number
  status: ReturnType<typeof getMarketStatusChip>
  term: ReturnType<typeof getMarketTypeChip>
  name: string
  borrower: string | undefined
  asset: string
  apr: number
  debt: TokenAmount | undefined
  capacityLeft: TokenAmount
  withdrawalBatchDuration: number
  onboardingMode: MarketOnboardingMode | undefined
  borrowable: TokenAmount
}

export const OtherMarketsTables = ({
  marketAccounts,
  onboardingByMarket,
  isLoading,
  filters,
  tab,
}: MarketsTablesProps & {
  onboardingByMarket: MarketOnboardingByAddress
  tab:
    | BorrowerMarketDashboardTabs.SELF_ONBOARD
    | BorrowerMarketDashboardTabs.MANUAL
    | BorrowerMarketDashboardTabs.OTHER_TERMINATED
}) => {
  const { t } = useTranslation()

  const { data: borrowers } = useBorrowerNames()

  const rows: GridRowsProp<OtherMarketsTableModel> = marketAccounts.map(
    (account) => {
      const { market } = account

      const {
        address,
        name,
        borrower: borrowerAddress,
        underlyingToken,
        annualInterestBips,
        borrowableAssets,
        maxTotalSupply,
        totalSupply,
        withdrawalBatchDuration,
        chainId,
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
        chainId,
        status: marketStatus,
        term: marketType,
        name,
        borrowerAddress,
        borrower: borrowerName,
        asset: underlyingToken.symbol,
        apr: annualInterestBips,
        capacityLeft: maxTotalSupply.sub(totalSupply),
        borrowable: borrowableAssets,
        debt: getMarketTotalDebt(market),
        withdrawalBatchDuration,
        onboardingMode: getKnownMarketOnboardingMode(
          market.version,
          market.address,
          onboardingByMarket,
        ),
      }
    },
  )

  const terminated = rows.filter((market) => {
    const account = marketAccounts.find((a) => a.market.address === market.id)
    return account?.market.isClosed
  })

  const activeRows = rows.filter((market) => {
    const account = marketAccounts.find((a) => a.market.address === market.id)
    return !account?.market.isClosed
  })

  const selfOnboard = activeRows.filter(
    (market) => market.onboardingMode === MarketOnboardingMode.SelfOnboard,
  )
  const manual = activeRows.filter(
    (market) => market.onboardingMode === MarketOnboardingMode.BorrowerApproval,
  )

  const columns: TypeSafeColDef<OtherMarketsTableModel>[] = [
    {
      field: "name",
      headerName: t("dashboard.markets.tables.header.name"),
      flex: 2.5,
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

          <Link
            href={`${ROUTES.borrower.profile}/${params.row.borrowerAddress}`}
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
    {
      field: "borrowable",
      headerName: t("dashboard.markets.tables.header.borrowable"),
      minWidth: 100,
      flex: 1,
      headerAlign: "right",
      align: "right",
      sortComparator: tokenAmountComparator,
      renderCell: (
        params: GridRenderCellParams<OtherMarketsTableModel, TokenAmount>,
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
      field: "capacityLeft",
      headerName: t("dashboard.markets.tables.header.capacity"),
      minWidth: 100,
      flex: 1,
      headerAlign: "right",
      align: "right",
      sortComparator: tokenAmountComparator,
      renderCell: (
        params: GridRenderCellParams<OtherMarketsTableModel, TokenAmount>,
      ) => (
        <Link
          href={buildMarketHref(
            params.row.id,
            params.row.chainId,
            ROUTES.borrower.market,
          )}
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
  ]

  const tabTables = {
    [BorrowerMarketDashboardTabs.SELF_ONBOARD]: {
      label: t("dashboard.markets.tables.other.selfOnboard"),
      rows: selfOnboard,
    },
    [BorrowerMarketDashboardTabs.MANUAL]: {
      label: t("dashboard.markets.tables.other.manual"),
      rows: manual,
    },
    [BorrowerMarketDashboardTabs.OTHER_TERMINATED]: {
      label: t("dashboard.markets.tables.other.terminated"),
      rows: terminated,
    },
  }

  const { label: tabLabel, rows: tabRows } = tabTables[tab]

  const [paginationModel, setPaginationModel] = React.useState({
    pageSize: 50,
    page: 0,
  })

  const { assetFilter, statusFilter, nameFilter, withdrawalCycleFilter } =
    filters

  useEffect(() => {
    setPaginationModel((prevState) => ({ ...prevState, page: 0 }))
  }, [tab, assetFilter, statusFilter, nameFilter, withdrawalCycleFilter])

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
        marketsLength={tabRows.length}
        isLoading={isLoading}
        isOpen
        hideSummary
        nameFilter={filters.nameFilter}
        assetFilter={filters.assetFilter}
        statusFilter={filters.statusFilter}
        showNoFilteredMarkets
        noMarketsTitle={t("dashboard.markets.noMarkets.explore.title")}
        noMarketsSubtitle={t("dashboard.markets.noMarkets.explore.subtitle")}
      >
        <DataGrid
          disableVirtualization
          sx={DataGridSx}
          getRowHeight={() => "auto"}
          rows={tabRows}
          columns={columns}
          columnHeaderHeight={40}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[50]}
          slots={{
            pagination: TablePagination,
          }}
          hideFooter={tabRows.length <= paginationModel.pageSize}
        />
      </MarketsTableAccordion>
    </Box>
  )
}
