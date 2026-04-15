"use client"

import { useMemo, useState } from "react"
import * as React from "react"

import { Box, Button, FormControlLabel, Typography } from "@mui/material"
import { DataGrid, GridRenderCellParams, GridRowsProp } from "@mui/x-data-grid"
import {
  DepositStatus,
  MarketVersion,
  TokenAmount,
} from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"

import { TypeSafeColDef } from "@/app/[locale]/borrower/components/MarketsSection/сomponents/MarketsTables/interface"
import { LinkCell } from "@/app/[locale]/borrower/components/MarketsTables/style"
import { LenderOtherMarketsTableModel } from "@/app/[locale]/lender/components/MarketsSection/components/MarketsTables/OtherMarketsTables/interface"
import { useLenderMarketsContext } from "@/app/[locale]/lender/context"
import ExtendedCheckbox from "@/components/@extended/ExtendedСheckbox"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketTypeChip } from "@/components/@extended/MarketTypeChip"
import {
  getAdsCellProps,
  getAdsTooltipComponent,
} from "@/components/AdsBanners/adsHelpers"
import { AprChip } from "@/components/AprChip"
import { BorrowerProfileChip } from "@/components/BorrowerProfileChip"
import { FilterTextField } from "@/components/FilterTextfield"
import { MarketsFilterSelect } from "@/components/MarketsFilterSelect"
import { MarketsFilterSelectItem } from "@/components/MarketsFilterSelect/interface"
import { TablePagination } from "@/components/TablePagination"
import { useAllTokensWithMarkets } from "@/hooks/useAllTokensWithMarkets"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { marketStatusesMock } from "@/mocks/mocks"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { lh, pxToRem } from "@/theme/units"
import {
  statusComparator,
  tokenAmountComparator,
  typeComparator,
} from "@/utils/comparators"
import { filterMarketAccounts } from "@/utils/filters"
import {
  buildMarketHref,
  formatBps,
  formatSecsToHours,
  formatTokenWithCommas,
  trimAddress,
} from "@/utils/formatters"
import { getMarketStatusChip } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

const SORT_OPTIONS = [
  "Most Funded",
  "Highest Yield",
  "Most Liquid",
  "Newest",
] as const

type SortOption = (typeof SORT_OPTIONS)[number]

const withdrawalCycleOptions = [
  { id: "0-86400", name: "≤ 24h" },
  { id: "86401-259200", name: "1 - 3 days" },
  { id: "259201-604800", name: "3 - 7 days" },
  { id: "604801-Infinity", name: "7+ days" },
]

const DATA_GRID_MIN_HEIGHT = "106px"

export const DataGridSx = {
  overflow: "visible",
  height: "auto !important",
  minHeight: DATA_GRID_MIN_HEIGHT,
  maxWidth: "calc(100vw - 267px)",
  padding: "0 16px",
  "& .MuiDataGrid-main": {
    overflow: "visible",
    height: "auto !important",
    minHeight: DATA_GRID_MIN_HEIGHT,
    flex: "0 0 auto !important",
  },
  "& .MuiDataGrid-virtualScroller": {
    overflow: "visible",
    height: "auto !important",
    minHeight: "66px",
    flex: "0 0 auto !important",
  },
  "& .MuiDataGrid-virtualScrollerContent": {
    height: "auto !important",
  },
  "& .MuiDataGrid-virtualScrollerRenderZone": {
    position: "static !important" as const,
    transform: "none !important",
  },
  "& .MuiDataGrid-columnHeaders": {
    position: "sticky",
    top: 0,
    zIndex: 2,
    backgroundColor: COLORS.white,
  },
  "& .MuiDataGrid-columnHeader": {
    padding: 0,
  },
  "& .MuiDataGrid-row": {
    minHeight: "66px !important",
    maxHeight: "66px !important",
    cursor: "pointer",
  },
  "& .MuiDataGrid-cell": {
    padding: "0px",
    minHeight: "66px",
    height: "auto",
  },
}

export const ExploreMarketsTable = () => {
  const { t } = useTranslation()
  const router = useRouter()
  const { marketAccounts, borrowers, isLoadingInitial, isLoadingUpdate } =
    useLenderMarketsContext()
  const { isTestnet } = useCurrentNetwork()

  const [sortMode, setSortMode] = useState<SortOption>("Most Funded")
  const [search, setSearch] = useState("")
  const [assets, setAssets] = useState<MarketsFilterSelectItem[]>([])
  const [statuses, setStatuses] = useState<MarketsFilterSelectItem[]>([])
  const [withdrawalCycles, setWithdrawalCycles] = useState<
    MarketsFilterSelectItem[]
  >([])
  const [showSelfOnboard, setShowSelfOnboard] = useState(true)
  const [showOnboardByBorrower, setShowOnboardByBorrower] = useState(false)

  const [paginationModel, setPaginationModel] = useState({
    pageSize: 50,
    page: 0,
  })

  const { data: tokensRaw } = useAllTokensWithMarkets()
  const tokens = useMemo(() => {
    if (isTestnet) {
      return tokensRaw?.filter(
        (token, index, self) =>
          index === self.findIndex((x) => x.symbol === token.symbol),
      )
    }
    return tokensRaw
  }, [tokensRaw, isTestnet])

  const rows = useMemo((): GridRowsProp<LenderOtherMarketsTableModel> => {
    const filtered = filterMarketAccounts(
      marketAccounts,
      search,
      statuses,
      assets,
      borrowers,
      withdrawalCycles,
    ).filter((a) => !a.market.isClosed)

    const onboardFiltered = filtered.filter((account) => {
      const isSelf =
        !account.hasEverInteracted &&
        account.market.version === MarketVersion.V2 &&
        account.depositAvailability === DepositStatus.Ready

      if (isSelf) return showSelfOnboard
      return showOnboardByBorrower
    })

    const sorted = [...onboardFiltered].sort((a, b) => {
      if (sortMode === "Highest Yield") {
        return b.market.annualInterestBips - a.market.annualInterestBips
      }
      if (sortMode === "Most Liquid") {
        const capA = a.market.maxTotalSupply.sub(a.market.totalSupply)
        const capB = b.market.maxTotalSupply.sub(b.market.totalSupply)
        if (capB.gt(capA)) return 1
        if (capA.gt(capB)) return -1
        return 0
      }
      if (sortMode === "Newest") {
        return 0
      }
      // Most Funded
      if (b.market.totalSupply.gt(a.market.totalSupply)) return 1
      if (a.market.totalSupply.gt(b.market.totalSupply)) return -1
      return 0
    })

    return sorted.slice(0, 5).map((account) => {
      const { market } = account
      const {
        address,
        name,
        borrower: borrowerAddress,
        underlyingToken,
        annualInterestBips,
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

      return {
        id: address,
        status: getMarketStatusChip(market),
        term: getMarketTypeChip(market),
        name,
        borrower: borrowerName,
        borrowerAddress,
        asset: underlyingToken.symbol,
        apr: annualInterestBips,
        withdrawalBatchDuration,
        debt: totalSupply,
        capacityLeft: maxTotalSupply.sub(totalSupply),
        isSelfOnboard:
          !account.hasEverInteracted &&
          market.version === MarketVersion.V2 &&
          account.depositAvailability === DepositStatus.Ready,
        button: address,
        chainId,
      }
    })
  }, [
    marketAccounts,
    borrowers,
    sortMode,
    search,
    assets,
    statuses,
    withdrawalCycles,
    showSelfOnboard,
    showOnboardByBorrower,
  ])

  const handleRowClick = (
    params: { row: LenderOtherMarketsTableModel },
    event: { target: EventTarget | null },
  ) => {
    const target = event.target as HTMLElement
    if (target.closest("a") || target.closest("button")) return
    router.push(buildMarketHref(params.row.id, params.row.chainId))
  }

  const columns: TypeSafeColDef<LenderOtherMarketsTableModel>[] = [
    {
      field: "name",
      headerName: t("dashboard.markets.tables.header.name"),
      flex: 2.5,
      minWidth: 200,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <Box
          sx={{
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
          {params.row.borrowerAddress ? (
            <Link
              href={`${ROUTES.lender.profile}/${params.row.borrowerAddress}`}
              prefetch={false}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              style={{ display: "flex", textDecoration: "none" }}
            >
              <BorrowerProfileChip borrower={params.row.borrower} />
            </Link>
          ) : (
            <BorrowerProfileChip borrower={params.row.borrower} />
          )}
        </Box>
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
        <Box sx={{ ...LinkCell, justifyContent: "flex-start" }}>
          <Box width="120px">
            <MarketStatusChip status={params.value} />
          </Box>
        </Box>
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
        <Box sx={{ ...LinkCell, justifyContent: "flex-start" }}>
          <Box minWidth="170px">
            <MarketTypeChip type="table" {...params.value} />
          </Box>
        </Box>
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
          params.row.id,
          formatBps(params.value),
        )
        const adsCellProps = getAdsCellProps(params.row.id)

        return (
          <Box sx={{ ...LinkCell, justifyContent: "flex-end" }}>
            <AprChip
              isBonus={!!adsCellProps}
              baseApr={formatBps(params.value)}
              icons={adsCellProps?.icons}
              adsComponent={adsComponent}
            />
          </Box>
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
        <Box sx={{ ...LinkCell, justifyContent: "flex-end" }}>
          {formatSecsToHours(params.value, true)}
        </Box>
      ),
    },
    {
      field: "asset",
      headerName: t("dashboard.markets.tables.header.asset"),
      minWidth: 112,
      flex: 0.5,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => (
        <Box sx={{ ...LinkCell, justifyContent: "flex-end" }}>
          {params.value}
        </Box>
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
        params: GridRenderCellParams<LenderOtherMarketsTableModel, TokenAmount>,
      ) => (
        <Box sx={{ ...LinkCell, justifyContent: "flex-end" }}>
          {params.value && params.value.gt(0)
            ? formatTokenWithCommas(params.value, {
                withSymbol: false,
                fractionDigits: 2,
              })
            : "0"}
        </Box>
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
        <Box sx={{ ...LinkCell, justifyContent: "flex-end" }}>
          {params.value
            ? formatTokenWithCommas(params.value, {
                withSymbol: false,
                fractionDigits: 2,
              })
            : "0"}
        </Box>
      ),
    },
    {
      sortable: false,
      field: "button",
      headerName: "",
      minWidth: 100,
      flex: 1,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => (
        <Box sx={{ ...LinkCell, justifyContent: "flex-end" }}>
          {params.row.isSelfOnboard ? (
            <Button size="small" variant="contained" color="secondary">
              {t("dashboard.markets.tables.other.depositBTN")}
            </Button>
          ) : (
            <Link
              href={`${ROUTES.lender.profile}/${params.row.borrowerAddress}`}
              prefetch={false}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              style={{ textDecoration: "none" }}
            >
              <Button size="small" variant="contained" color="secondary">
                {t("dashboard.markets.tables.other.requestBTN")}
              </Button>
            </Link>
          )}
        </Box>
      ),
    },
  ]

  return (
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{
          width: "fit-content",
          display: "flex",
          gap: "4px",
          margin: "16px 0 18px",
        }}
      >
        {SORT_OPTIONS.map((option) => (
          <Button
            key={option}
            variant="text"
            onClick={() => setSortMode(option)}
            sx={{
              fontWeight: sortMode === option ? 600 : 500,
              backgroundColor:
                sortMode === option ? COLORS.whiteSmoke : "transparent",
            }}
          >
            {option}
          </Button>
        ))}
      </Box>

      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box sx={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <MarketsFilterSelect
            placeholder={t("dashboard.markets.filters.assets")}
            options={
              tokens?.map((token) => ({
                id: token.address,
                name: token.symbol,
              })) ?? []
            }
            selected={assets}
            setSelected={setAssets}
          />

          <MarketsFilterSelect
            placeholder={t("dashboard.markets.filters.statuses")}
            options={marketStatusesMock}
            selected={statuses}
            setSelected={setStatuses}
          />

          <MarketsFilterSelect
            placeholder="Withdrawal Cycle"
            options={withdrawalCycleOptions}
            selected={withdrawalCycles}
            setSelected={setWithdrawalCycles}
          />

          <FormControlLabel
            label="Self-Onboard"
            control={
              <ExtendedCheckbox
                checked={showSelfOnboard}
                onChange={(e) => setShowSelfOnboard(e.target.checked)}
                sx={{
                  "& ::before": {
                    transform: "translate(-3px, -3px) scale(0.75)",
                  },
                }}
              />
            }
            sx={{
              marginLeft: "18px",
              "& .MuiTypography-root": {
                fontSize: pxToRem(13),
                lineHeight: lh(20, 13),
              },
            }}
          />

          <FormControlLabel
            label="Onboard by Borrower"
            control={
              <ExtendedCheckbox
                checked={showOnboardByBorrower}
                onChange={(e) => setShowOnboardByBorrower(e.target.checked)}
                sx={{
                  "& ::before": {
                    transform: "translate(-3px, -3px) scale(0.75)",
                  },
                }}
              />
            }
            sx={{
              marginLeft: "18px",
              "& .MuiTypography-root": {
                fontSize: pxToRem(13),
                lineHeight: lh(20, 13),
              },
            }}
          />
        </Box>

        <FilterTextField
          value={search}
          setValue={setSearch}
          placeholder={t("dashboard.markets.filters.name")}
          width="264px"
        />
      </Box>

      <DataGrid
        disableVirtualization
        sx={DataGridSx}
        rowHeight={66}
        rows={rows}
        columns={columns}
        columnHeaderHeight={40}
        onRowClick={handleRowClick}
        loading={isLoadingInitial || isLoadingUpdate}
      />

      <Box
        sx={{ display: "flex", justifyContent: "center", marginTop: "18px" }}
      >
        <Button size="small" variant="contained" color="secondary">
          Explore All Markets
        </Button>
      </Box>
    </Box>
  )
}
