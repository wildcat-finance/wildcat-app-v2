"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import * as React from "react"

import {
  Box,
  Button,
  ButtonBase,
  FormControlLabel,
  Skeleton,
  Typography,
} from "@mui/material"
import {
  DataGrid,
  GridRow,
  GridRowProps,
  GridRenderCellParams,
  GridRowsProp,
  GridSortModel,
} from "@mui/x-data-grid"
import { DepositStatus, HooksKind, TokenAmount } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"

import { TypeSafeColDef } from "@/app/[locale]/borrower/components/MarketsSection/сomponents/MarketsTables/interface"
import { LinkCell } from "@/app/[locale]/borrower/components/MarketsTables/style"
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
import {
  ComposableChipCell,
  COMPOSABLE_GRID_RESIZE_THROTTLE_MS,
  ComposableExpansionProvider,
  ComposableOnlySwitch,
  ComposableRowPanel,
} from "@/components/Destinations"
import { MarketsFilterSelect } from "@/components/MarketsFilterSelect"
import { MarketsFilterSelectItem } from "@/components/MarketsFilterSelect/interface"
import { MarketsTableWrapper } from "@/components/MarketsTableWrapper"
import { MobileFilterButton } from "@/components/Mobile/MobileFilterButton"
import { MobileMarketCard } from "@/components/Mobile/MobileMarketCard"
import { MobileSearchButton } from "@/components/Mobile/MobileSearchButton"
import { RepeatingSkeletons } from "@/components/RepeatingSkeletons"
import { useDestinations } from "@/hooks/destinations/useDestinations"
import { useAllTokensWithMarkets } from "@/hooks/useAllTokensWithMarkets"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useMobileResolution } from "@/hooks/useMobileResolution"
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
import {
  getLenderMarketAction,
  getKnownMarketOnboardingMode,
  LenderMarketAction,
  MarketOnboardingMode,
} from "@/utils/marketOnboarding"
import {
  compareByHighestYield,
  compareByShortestCycle,
} from "@/utils/marketSort"
import {
  getMarketStatusChip,
  getPenaltyBorrowers,
  isExploreVisible,
  MarketStatus,
} from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

import { rankMarketsByActivity } from "./activityRanking"

const SORT_OPTIONS = [
  "Most Funded",
  "Highest Yield",
  "Shortest Cycle",
  "Newest",
] as const

type SortOption = (typeof SORT_OPTIONS)[number]

const withdrawalCycleOptions = [
  { id: "0-86400", name: "≤ 24h" },
  { id: "86401-259200", name: "1 - 3 days" },
  { id: "259201-604800", name: "3 - 7 days" },
  { id: "604801-Infinity", name: "7+ days" },
]

const statusFilterOptions = marketStatusesMock.filter(
  (option) => option.id !== MarketStatus.PENALTY,
)

const EXPLORE_PAGE_SIZE = 5
const MAX_GRID_PAGE_SIZE = 100

// Desktop: the table grows past EXPLORE_PAGE_SIZE to fill the viewport,
// recomputed on resize. These mirror the DataGrid row/header sizes.
const GRID_ROW_HEIGHT = 66
const GRID_HEADER_HEIGHT = 36
const GRID_RESERVED_BELOW = 78

const DATA_GRID_MIN_HEIGHT = "102px"

export const DataGridSx = {
  overflow: "visible",
  height: "auto !important",
  minHeight: DATA_GRID_MIN_HEIGHT,
  maxWidth: "calc(100vw - 267px)",
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
  "& .MuiDataGrid-scrollbar, & .MuiDataGrid-scrollbarFiller": {
    display: "none",
  },
  "& .MuiDataGrid-columnHeaders": {
    position: "sticky",
    top: 0,
    zIndex: 2,
    backgroundColor: COLORS.white,
  },
  "& .MuiDataGrid-columnHeader": {
    padding: 0,
    color: COLORS.manate,
    lineHeight: "16px",
    borderBottomColor: COLORS.whiteLilac,
    "& .MuiDataGrid-columnHeaderTitleContainer": { margin: 0, gap: "8px" },
    "& .MuiDataGrid-columnHeaderTitle": { lineHeight: "16px" },
    "& .MuiDataGrid-sortIcon path": { fill: COLORS.manate },
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
    borderColor: COLORS.whiteLilac,
  },
  "& .MuiDataGrid-cell[data-field='apr']": {
    overflow: "visible",
  },
  "& .MuiDataGrid-row:last-child .MuiDataGrid-cell": {
    borderBottom: "none",
    borderTopColor: COLORS.whiteLilac,
  },
}

const ExploreFilterSelectsSx = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  "& .MuiInputBase-root.MuiFilledInput-root": {
    paddingLeft: "3px",
    borderColor: COLORS.iron,
    "&:hover": { borderColor: COLORS.greySuit },
    "&.Mui-focused": { borderColor: COLORS.black07 },
  },
  "& .MuiInputBase-root .MuiSelect-select.MuiInputBase-input": {
    paddingRight: "31px",
  },
  "& .MuiInputBase-root .MuiSelect-select > .MuiBox-root > .MuiTypography-root":
    { color: COLORS.blackRock },
  "& .MuiInputBase-root .MuiSelect-icon": {
    transform: "scale(0.8)",
    "&.MuiSelect-iconOpen": { transform: "scale(0.8) rotate(180deg)" },
  },
}

const ActionButtonSx = {
  color: COLORS.blackRock,
}

export type LenderOtherMarketsTableModel = {
  id: string
  chainId: number
  status: ReturnType<typeof getMarketStatusChip>
  term: ReturnType<typeof getMarketTypeChip>
  name: string
  borrower: string | undefined
  borrowerAddress: string | undefined
  asset: string
  debt: TokenAmount | undefined
  capacity: TokenAmount
  apr: number
  withdrawalBatchDuration: number
  onboardingMode: MarketOnboardingMode | undefined
  depositStatus: DepositStatus
  button?: string
  capacityLeft: TokenAmount
  destinationsCount: number
  marketTokenSymbol: string
}

// Native 11×9 box — sizing via fontSize puts the arrow in a square em-box,
// letterboxing it off the label's optical center
const MarketClickableRow = (props: GridRowProps) => {
  const router = useRouter()
  const href = buildMarketHref(props.row.id, props.row.chainId)

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    props.onClick?.(event)
    if (event.defaultPrevented) return

    if (event.metaKey || event.ctrlKey || event.shiftKey) {
      window.open(href, "_blank", "noopener,noreferrer")
      return
    }

    router.push(href)
  }

  const handleAuxClick = (event: React.MouseEvent<HTMLDivElement>) => {
    props.onAuxClick?.(event)
    if (!event.defaultPrevented && event.button === 1) {
      window.open(href, "_blank", "noopener,noreferrer")
    }
  }

  return (
    <>
      <GridRow {...props} onClick={handleClick} onAuxClick={handleAuxClick} />
      <ComposableRowPanel
        rowId={props.row.id}
        chainId={props.row.chainId}
        marketSymbol={props.row.marketTokenSymbol}
        aprBips={props.row.apr}
        withdrawalBatchDuration={props.row.withdrawalBatchDuration}
      />
    </>
  )
}

export const ExploreMarketsTable = () => {
  const isMobile = useMobileResolution()
  const { t } = useTranslation()
  const { marketAccounts, borrowers, isLoadingInitial, onboardingByMarket } =
    useLenderMarketsContext()
  const { isTestnet, targetChainId } = useCurrentNetwork()
  const isLoading = isLoadingInitial

  const [sortMode, setSortMode] = useState<SortOption>("Most Funded")
  const [sortModel, setSortModel] = useState<GridSortModel>([])

  const handleSortModeChange = (option: SortOption) => {
    setSortMode(option)
    setSortModel([])
  }
  const [search, setSearch] = useState("")
  const [assets, setAssets] = useState<MarketsFilterSelectItem[]>([])
  const [statuses, setStatuses] = useState<MarketsFilterSelectItem[]>([])
  const [withdrawalCycles, setWithdrawalCycles] = useState<
    MarketsFilterSelectItem[]
  >([])
  const [showSelfOnboard, setShowSelfOnboard] = useState(true)
  const [showOnboardByBorrower, setShowOnboardByBorrower] = useState(false)
  const [showComposableOnly, setShowComposableOnly] = useState(false)

  const { markets: destinationsByMarket } = useDestinations(targetChainId)
  const composableMarkets = useMemo(
    () => new Set(Object.keys(destinationsByMarket)),
    [destinationsByMarket],
  )

  const [visibleMobileRows, setVisibleMobileRows] = useState(EXPLORE_PAGE_SIZE)
  useEffect(() => {
    setVisibleMobileRows(EXPLORE_PAGE_SIZE)
  }, [
    sortMode,
    search,
    assets,
    statuses,
    withdrawalCycles,
    showSelfOnboard,
    showOnboardByBorrower,
    showComposableOnly,
  ])

  const gridWrapRef = useRef<HTMLDivElement>(null)
  const mobileListRef = useRef<HTMLDivElement>(null)
  const mobileRevealFrom = useRef<number | null>(null)

  useEffect(() => {
    if (mobileRevealFrom.current === null) return
    mobileListRef.current
      ?.querySelectorAll<HTMLElement>("[data-market-card-link]")
      [mobileRevealFrom.current]?.focus()
    mobileRevealFrom.current = null
  }, [visibleMobileRows])
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: EXPLORE_PAGE_SIZE,
  })

  // Desktop: grow the row count to fill the viewport (never below the default
  // page size, which laptop-height screens already scroll for). Recomputes on
  // mount, when loading settles (layout above the grid shifts), and on resize.
  useEffect(() => {
    if (isMobile) return undefined
    const recompute = () => {
      const el = gridWrapRef.current
      if (!el) return
      const gridTop = el.getBoundingClientRect().top + window.scrollY
      const available =
        window.innerHeight - gridTop - GRID_HEADER_HEIGHT - GRID_RESERVED_BELOW
      const next = Math.max(
        EXPLORE_PAGE_SIZE,
        Math.floor(available / GRID_ROW_HEIGHT),
      )
      setPaginationModel((m) =>
        m.pageSize === next ? m : { page: 0, pageSize: next },
      )
    }
    recompute()
    // Coalesce resize storms (window drags) to one recompute per frame
    let frame: number | null = null
    const onResize = () => {
      if (frame !== null) return
      frame = window.requestAnimationFrame(() => {
        frame = null
        recompute()
      })
    }
    window.addEventListener("resize", onResize)
    return () => {
      window.removeEventListener("resize", onResize)
      if (frame !== null) window.cancelAnimationFrame(frame)
    }
  }, [isMobile, isLoading])

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

  const { rows, totalRows, composableCount } = useMemo<{
    rows: GridRowsProp<LenderOtherMarketsTableModel>
    totalRows: number
    composableCount: number
  }>(() => {
    const penaltyBorrowers = getPenaltyBorrowers(
      marketAccounts.map((a) => a.market),
    )
    const filtered = filterMarketAccounts(
      marketAccounts,
      search,
      statuses,
      assets,
      borrowers,
      withdrawalCycles,
    ).filter(
      (a) =>
        isExploreVisible(a.market) &&
        !penaltyBorrowers.has(a.market.borrower.toLowerCase()),
    )

    const onboardFiltered = filtered.filter((account) => {
      const onboardingMode = getKnownMarketOnboardingMode(
        account.market.version,
        account.market.address,
        onboardingByMarket,
      )

      if (onboardingMode === MarketOnboardingMode.SelfOnboard) {
        return showSelfOnboard
      }
      if (onboardingMode === MarketOnboardingMode.BorrowerApproval) {
        return showOnboardByBorrower
      }
      return false
    })

    const composableFiltered = onboardFiltered.filter((account) =>
      composableMarkets.has(account.market.address.toLowerCase()),
    )
    const candidates = showComposableOnly ? composableFiltered : onboardFiltered

    const compareMarkets = (
      a: (typeof onboardFiltered)[number],
      b: (typeof onboardFiltered)[number],
    ) => {
      if (sortMode === "Highest Yield") {
        return compareByHighestYield(a, b)
      }
      if (sortMode === "Shortest Cycle") {
        return compareByShortestCycle(a, b)
      }
      if (sortMode === "Newest") {
        return (
          (b.market.deployedEvent?.blockTimestamp ?? 0) -
          (a.market.deployedEvent?.blockTimestamp ?? 0)
        )
      }
      return tokenAmountComparator(b.market.totalSupply, a.market.totalSupply)
    }

    // Preserve the activity-qualified Top Markets first, then widen the
    // window and finally use the remaining catalogue to fill empty slots.
    // User-selected ranking still applies within each activity tier.
    const sorted = rankMarketsByActivity(
      candidates,
      isTestnet === true,
      Math.floor(Date.now() / 1000),
      compareMarkets,
    )

    let visibleRows = isMobile ? visibleMobileRows : paginationModel.pageSize
    if (showComposableOnly) visibleRows = MAX_GRID_PAGE_SIZE
    const accountsToMap = sorted.slice(0, visibleRows)

    return {
      totalRows: sorted.length,
      composableCount: composableFiltered.length,
      rows: accountsToMap.map((account) => {
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
          capacity: maxTotalSupply,
          capacityLeft: maxTotalSupply.sub(totalSupply),
          onboardingMode: getKnownMarketOnboardingMode(
            market.version,
            market.address,
            onboardingByMarket,
          ),
          depositStatus: account.depositAvailability,
          button: address,
          chainId,
          destinationsCount:
            destinationsByMarket[address.toLowerCase()]?.length ?? 0,
          marketTokenSymbol: market.marketToken.symbol,
        }
      }),
    }
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
    onboardingByMarket,
    isTestnet,
    isMobile,
    visibleMobileRows,
    paginationModel.pageSize,
    composableMarkets,
    destinationsByMarket,
    showComposableOnly,
  ])

  const gridPaginationModel = useMemo(
    () =>
      rows.length > paginationModel.pageSize
        ? {
            page: 0,
            pageSize: Math.min(rows.length, MAX_GRID_PAGE_SIZE),
          }
        : paginationModel,
    [rows.length, paginationModel],
  )

  const showComposableToggle = composableCount > 0 || showComposableOnly
  const hasAnyDestinations = Object.keys(destinationsByMarket).length > 0

  // Stable identity: a fresh columns array makes the DataGrid rebuild column
  // state and re-render every cell on each keystroke/filter/poll render
  const columns = useMemo<TypeSafeColDef<LenderOtherMarketsTableModel>[]>(
    () => [
      {
        field: "name",
        headerName: "Market",
        flex: 212,
        minWidth: 212,
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
              "& > a:last-child > .MuiBox-root, & > .MuiBox-root:last-child": {
                paddingLeft: "4px",
                "& > .MuiTypography-root": { color: COLORS.blackRock },
              },
            }}
          >
            <Link
              href={buildMarketHref(params.row.id, params.row.chainId)}
              onClick={(event) => event.stopPropagation()}
              style={{
                width: "100%",
                minWidth: 0,
                color: "inherit",
                textDecoration: "none",
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
                  color: COLORS.blackRock,
                }}
              >
                {params.value}
              </Typography>
            </Link>
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
        flex: 104,
        minWidth: 104,
        headerAlign: "left",
        align: "left",
        sortComparator: statusComparator,
        renderCell: (params) => (
          <Box
            sx={{
              ...LinkCell,
              justifyContent: "flex-start",
              "& .MuiChip-icon": { fontSize: "12px" },
            }}
          >
            <Box width="120px">
              <MarketStatusChip status={params.value} />
            </Box>
          </Box>
        ),
      },
      {
        field: "term",
        headerName: t("dashboard.markets.tables.header.term"),
        flex: 112,
        minWidth: 112,
        headerAlign: "left",
        align: "left",
        sortComparator: typeComparator,
        renderCell: (params) => (
          <Box
            sx={{
              ...LinkCell,
              justifyContent: "flex-start",
              paddingLeft:
                params.value.kind === HooksKind.OpenTerm ? "6px" : "4px",
              "& .MuiTypography-root": {
                fontSize: pxToRem(11),
                lineHeight: lh(16, 11),
                color: COLORS.blackRock,
              },
            }}
          >
            <Box minWidth="170px">
              <MarketTypeChip type="table" {...params.value} />
            </Box>
          </Box>
        ),
      },
      {
        field: "apr",
        headerName: t("dashboard.markets.tables.header.apr"),
        flex: 78,
        minWidth: 78,
        headerAlign: "right",
        align: "right",
        renderCell: (params) => {
          const adsComponent = getAdsTooltipComponent(
            params.row.chainId,
            params.row.id,
            formatBps(params.value),
          )
          const adsCellProps = getAdsCellProps(
            params.row.chainId,
            params.row.id,
          )

          return (
            <Box
              sx={{
                ...LinkCell,
                justifyContent: "flex-end",
                "& .MuiTypography-root": { color: COLORS.blackRock },
                "& > .MuiBox-root > .MuiBox-root:first-of-type > .MuiBox-root:first-of-type":
                  {
                    border: 0,
                    boxShadow: `inset 0 0 0 1px ${COLORS.whiteLilac}`,
                    paddingRight: "4px",
                  },
              }}
            >
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
        flex: 78,
        minWidth: 78,
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
        flex: 104,
        minWidth: 104,
        headerAlign: "right",
        align: "right",
        renderCell: (params) => (
          <Box sx={{ ...LinkCell, justifyContent: "flex-end" }}>
            {params.value}
          </Box>
        ),
      },
      {
        field: "debt",
        headerName: "Total Debt / Remaining",
        flex: 191,
        minWidth: 191,
        headerAlign: "right",
        align: "right",
        sortComparator: tokenAmountComparator,
        renderCell: (
          params: GridRenderCellParams<
            LenderOtherMarketsTableModel,
            TokenAmount
          >,
        ) => {
          const { capacityLeft } = params.row
          const debtRaw = params.value ? params.value.raw.toBigInt() : BigInt(0)
          // capacityLeft can go negative when a borrower shrinks capacity below
          // the current supply, so clamp the fill to 0-100%
          const totalRaw = debtRaw + capacityLeft.raw.toBigInt()
          const debtPct =
            totalRaw > BigInt(0)
              ? Math.min(
                  100,
                  Number((debtRaw * BigInt(10000)) / totalRaw) / 100,
                )
              : 0

          return (
            <Box sx={{ ...LinkCell, justifyContent: "flex-end" }}>
              {/* Shifted down by half the caption height so the bar sits on the
                row centerline with the figures below it, per the design */}
              <Box
                sx={{
                  position: "relative",
                  top: "12px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: "6px",
                }}
              >
                <Box
                  sx={{
                    width: "110px",
                    maxWidth: "100%",
                    height: "4px",
                    borderRadius: "2px",
                    backgroundColor: COLORS.whiteLilac,
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      height: "100%",
                      width: `${debtPct}%`,
                      minWidth: debtRaw > BigInt(0) ? "5px" : 0,
                      borderRadius: "inherit",
                      backgroundColor: COLORS.blackRock,
                    }}
                  />
                </Box>
                <Typography
                  variant="text4"
                  sx={{ color: "#595A65", whiteSpace: "nowrap" }}
                >
                  {params.value
                    ? formatTokenWithCommas(params.value, {
                        withSymbol: false,
                        fractionDigits: 2,
                      })
                    : "0"}{" "}
                  /{" "}
                  {capacityLeft.gt(0)
                    ? formatTokenWithCommas(capacityLeft, {
                        withSymbol: false,
                        fractionDigits: 2,
                      })
                    : "0"}
                </Typography>
              </Box>
            </Box>
          )
        },
      },
      ...(hasAnyDestinations
        ? [
            {
              field: "destinationsCount",
              headerName: t("destinations.column"),
              flex: 144,
              minWidth: 144,
              headerAlign: "right",
              align: "right",
              sortable: true,
              renderCell: (
                params: GridRenderCellParams<LenderOtherMarketsTableModel>,
              ) => (
                <ComposableChipCell
                  rowId={params.row.id}
                  count={params.row.destinationsCount}
                />
              ),
            } satisfies TypeSafeColDef<LenderOtherMarketsTableModel>,
          ]
        : []),
      {
        sortable: false,
        field: "button",
        headerName: "",
        flex: 97,
        minWidth: 97,
        headerAlign: "right",
        align: "right",
        renderCell: (params) => {
          const action = getLenderMarketAction(
            params.row.onboardingMode,
            params.row.depositStatus,
          )

          return (
            <Box sx={{ ...LinkCell, justifyContent: "flex-end" }}>
              {action === LenderMarketAction.Deposit && (
                <Button
                  size="small"
                  variant="contained"
                  color="secondary"
                  sx={ActionButtonSx}
                >
                  {t("dashboard.markets.tables.other.depositBTN")}
                </Button>
              )}
              {action === LenderMarketAction.RequestAccess && (
                <Link
                  href={`${ROUTES.lender.profile}/${params.row.borrowerAddress}`}
                  prefetch={false}
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  style={{ textDecoration: "none" }}
                >
                  <Button
                    size="small"
                    variant="contained"
                    color="secondary"
                    sx={ActionButtonSx}
                  >
                    {t("dashboard.markets.tables.other.requestBTN")}
                  </Button>
                </Link>
              )}
              {(action === LenderMarketAction.DepositUnavailable ||
                action === LenderMarketAction.Unavailable) && (
                <Button
                  size="small"
                  variant="contained"
                  color="secondary"
                  disabled
                >
                  {action === LenderMarketAction.DepositUnavailable
                    ? t("dashboard.markets.tables.other.depositBTN")
                    : "Unavailable"}
                </Button>
              )}
            </Box>
          )
        },
      },
    ],
    [t, hasAnyDestinations],
  )

  if (isMobile)
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          paddingBottom: "8px",
        }}
      >
        <Box
          ref={mobileListRef}
          sx={{
            display: "flex",
            flexDirection: "column",
            // Overlap the carousel card above by 1px: at fractional display
            // scales the flush white-on-white edge otherwise renders as a
            // hairline seam over the dark page background
            marginTop: "-1px",
            padding: "0 8px 8px",
            borderRadius: "0 0 14px 14px",
            backgroundColor: COLORS.white,
          }}
        >
          <Typography
            sx={{
              padding: "32px 8px 8px",
              color: COLORS.bunker,
              fontSize: "18px",
              fontWeight: 500,
              lineHeight: "24px",
              letterSpacing: "-0.36px",
            }}
          >
            Top Markets
          </Typography>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 0 12px",
              overflowX: "auto",
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" },
            }}
          >
            {isLoading ? (
              <RepeatingSkeletons
                itemsLength={4}
                skeletonSX={{
                  height: "28px",
                  width: "90px",
                  flexShrink: 0,
                  borderRadius: "20px",
                }}
              />
            ) : (
              SORT_OPTIONS.map((option) => (
                <ButtonBase
                  key={option}
                  disableRipple
                  onClick={() => handleSortModeChange(option)}
                  aria-pressed={sortMode === option}
                  sx={{
                    flexShrink: 0,
                    padding: sortMode === option ? "4px 12px" : "0 2px",
                    borderRadius: "20px",
                    backgroundColor:
                      sortMode === option ? COLORS.athensGrey : "transparent",
                    color: COLORS.blackRock,
                    fontFamily: "inherit",
                    fontSize: "12px",
                    fontWeight: sortMode === option ? 600 : 500,
                    lineHeight: "20px",
                    whiteSpace: "nowrap",
                    "&.Mui-focusVisible": {
                      outline: `2px solid ${COLORS.ultramarineBlue}`,
                      outlineOffset: "1px",
                    },
                  }}
                >
                  {option}
                </ButtonBase>
              ))
            )}
          </Box>

          <Box
            sx={{
              minHeight: "48px",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "4px 2px",
              padding: "7px 0",
              borderTop: `1px solid ${COLORS.whiteLilac}`,
              borderBottom: `1px solid ${COLORS.whiteLilac}`,
            }}
          >
            {showComposableToggle ? (
              <ComposableOnlySwitch
                checked={showComposableOnly}
                onChange={setShowComposableOnly}
              />
            ) : (
              <Box />
            )}

            <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <MobileFilterButton
                assetsOptions={
                  tokens?.map((token) => ({
                    id: token.address,
                    name: token.symbol,
                  })) ?? []
                }
                statusesOptions={statusFilterOptions}
                withdrawalCycleOptions={withdrawalCycleOptions}
                marketAssets={assets}
                marketStatuses={statuses}
                marketWithdrawalCycles={withdrawalCycles}
                setMarketAssets={setAssets}
                setMarketStatuses={setStatuses}
                setMarketWithdrawalCycles={setWithdrawalCycles}
                showSelfOnboard={showSelfOnboard}
                showOnboardByBorrower={showOnboardByBorrower}
                setShowSelfOnboard={setShowSelfOnboard}
                setShowOnboardByBorrower={setShowOnboardByBorrower}
              />

              <MobileSearchButton
                marketAccounts={marketAccounts.filter(
                  (a) => !a.market.isClosed,
                )}
                marketSearch={search}
                setMarketSearch={setSearch}
                isExplorePage
              />
            </Box>
          </Box>

          {isLoading ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                paddingTop: "8px",
              }}
            >
              <RepeatingSkeletons
                itemsLength={5}
                skeletonSX={{ height: "130px", borderRadius: "10px" }}
              />
            </Box>
          ) : (
            rows.map((marketItem, index) => (
              <MobileMarketCard
                key={marketItem.id}
                marketItem={marketItem}
                showDestinations
                divider={index < rows.length - 1}
              />
            ))
          )}

          {!isLoading && showComposableOnly && rows.length === 0 && (
            <Typography
              variant="mobText3"
              sx={{
                color: COLORS.santasGrey,
                padding: "16px",
                textAlign: "center",
              }}
            >
              {t("destinations.noComposableMarkets")}
            </Typography>
          )}
        </Box>

        {!isLoading &&
          totalRows > 0 &&
          (totalRows > rows.length ? (
            <Button
              type="button"
              variant="contained"
              color="secondary"
              size="large"
              fullWidth
              onClick={(event) => {
                if (event.detail === 0) mobileRevealFrom.current = rows.length
                setVisibleMobileRows((count) => count + EXPLORE_PAGE_SIZE)
              }}
              sx={{
                alignSelf: "center",
                bgcolor: COLORS.white03,
                color: COLORS.white,
                "&:hover": { bgcolor: COLORS.white06 },
              }}
            >
              Show more markets
            </Button>
          ) : (
            <Button
              component={Link}
              href={ROUTES.lender.allMarkets}
              variant="contained"
              color="secondary"
              size="large"
              fullWidth
              sx={{
                alignSelf: "center",
                bgcolor: COLORS.white03,
                color: COLORS.white,
                "&:hover": { bgcolor: COLORS.white06 },
              }}
            >
              Go to All Markets
            </Button>
          ))}
      </Box>
    )

  return (
    <Box sx={{ width: "100%", padding: "0 16px 28px" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          marginTop: "16px",
        }}
      >
        <Typography
          variant="title3"
          sx={{
            display: "block",
            color: COLORS.bunker,
          }}
        >
          Top Markets
        </Typography>

        {showComposableToggle && (
          <ComposableOnlySwitch
            checked={showComposableOnly}
            onChange={setShowComposableOnly}
          />
        )}
      </Box>

      <Box
        sx={{
          width: "100%",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          rowGap: "8px",
          margin: "16px 0",
        }}
      >
        <Box sx={{ display: "flex", gap: "4px", flexShrink: 0 }}>
          {isLoading
            ? Array.from({ length: 4 }, (_, i) => `skeleton-row-${i}`).map(
                (key) => (
                  <Skeleton
                    key={key}
                    height="32px"
                    width="106px"
                    sx={{
                      borderRadius: "20px",
                      bgcolor: COLORS.athensGrey,
                    }}
                  />
                ),
              )
            : SORT_OPTIONS.map((option) => (
                <Button
                  key={option}
                  variant="text"
                  onClick={() => handleSortModeChange(option)}
                  sx={{
                    minWidth: 0,
                    padding: sortMode === option ? "6px 14px" : "6px 8px",
                    borderRadius: "30px",
                    lineHeight: "20px",
                    fontWeight: 600,
                    color: COLORS.blackRock,
                    whiteSpace: "nowrap",
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
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "8px 6px",
            marginLeft: "auto",
          }}
        >
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
              marginRight: "6px",
              "& .MuiTypography-root": {
                fontSize: pxToRem(13),
                lineHeight: lh(20, 13),
                color: COLORS.blackRock,
                whiteSpace: "nowrap",
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
              marginRight: "12px",
              "& .MuiTypography-root": {
                fontSize: pxToRem(13),
                lineHeight: lh(20, 13),
                color: COLORS.blackRock,
                whiteSpace: "nowrap",
              },
            }}
          />

          <Box sx={ExploreFilterSelectsSx}>
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
              placeholder="Withdrawal Cycle"
              options={withdrawalCycleOptions}
              selected={withdrawalCycles}
              setSelected={setWithdrawalCycles}
            />
          </Box>
        </Box>
      </Box>

      <Box ref={gridWrapRef} sx={{ overflowX: "auto", overflowY: "hidden" }}>
        <MarketsTableWrapper
          marketsLength={rows.length}
          rowsLength={gridPaginationModel.pageSize}
          isLoading={isLoading}
          noMarketsTitle={
            showComposableOnly
              ? t("destinations.noComposableMarkets")
              : "No Markets Available"
          }
          noMarketsSubtitle="There are no markets to display at the moment."
          highlightNoMarketsBanner
        >
          <ComposableExpansionProvider>
            <DataGrid
              disableVirtualization
              sx={DataGridSx}
              rowHeight={GRID_ROW_HEIGHT}
              resizeThrottleMs={COMPOSABLE_GRID_RESIZE_THROTTLE_MS}
              rows={rows}
              columns={columns}
              columnHeaderHeight={GRID_HEADER_HEIGHT}
              slots={{ row: MarketClickableRow }}
              loading={isLoading}
              sortModel={sortModel}
              onSortModelChange={setSortModel}
              paginationModel={gridPaginationModel}
              onPaginationModelChange={(model) => {
                if (gridPaginationModel === paginationModel) {
                  setPaginationModel(model)
                }
              }}
              pageSizeOptions={[gridPaginationModel.pageSize]}
              hideFooter
            />
          </ComposableExpansionProvider>
        </MarketsTableWrapper>
      </Box>

      <Box
        sx={{ display: "flex", justifyContent: "center", marginTop: "14px" }}
      >
        {isLoading ? (
          <Skeleton
            height="36px"
            width="136px"
            sx={{
              borderRadius: "10px",
              bgcolor: COLORS.athensGrey,
            }}
          />
        ) : (
          <Button
            component={Link}
            href="/lender/all-markets"
            size="small"
            variant="contained"
            color="secondary"
            sx={{
              padding: "8px 14px",
              borderRadius: "10px",
              fontSize: pxToRem(13),
              lineHeight: "20px",
              color: COLORS.blackRock,
            }}
          >
            Go to All Markets
          </Button>
        )}
      </Box>
    </Box>
  )
}
