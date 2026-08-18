"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import * as React from "react"

import {
  Box,
  Button,
  FormControlLabel,
  Skeleton,
  SvgIcon,
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
import { DepositStatus, TokenAmount } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"

import { TypeSafeColDef } from "@/app/[locale]/borrower/components/MarketsSection/сomponents/MarketsTables/interface"
import { LinkCell } from "@/app/[locale]/borrower/components/MarketsTables/style"
import { useLenderMarketsContext } from "@/app/[locale]/lender/context"
import ArrowRightIcon from "@/assets/icons/arrowRight_icon.svg"
import ExtendedCheckbox from "@/components/@extended/ExtendedСheckbox"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketTypeChip } from "@/components/@extended/MarketTypeChip"
import {
  getAdsCellProps,
  getAdsTooltipComponent,
} from "@/components/AdsBanners/adsHelpers"
import { AprChip } from "@/components/AprChip"
import { BorrowerProfileChip } from "@/components/BorrowerProfileChip"
import { MarketsFilterSelect } from "@/components/MarketsFilterSelect"
import { MarketsFilterSelectItem } from "@/components/MarketsFilterSelect/interface"
import { MarketsTableWrapper } from "@/components/MarketsTableWrapper"
import { MobileFilterButton } from "@/components/Mobile/MobileFilterButton"
import { MobileMarketCard } from "@/components/Mobile/MobileMarketCard"
import { MobileSearchButton } from "@/components/Mobile/MobileSearchButton"
import { RepeatingSkeletons } from "@/components/RepeatingSkeletons"
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

// Desktop: the table grows past EXPLORE_PAGE_SIZE to fill the viewport,
// recomputed on resize. These mirror the DataGrid row/header sizes.
const GRID_ROW_HEIGHT = 66
const GRID_HEADER_HEIGHT = 40
// "Go to All Markets" button + its 18px top margin + page bottom padding
const GRID_RESERVED_BELOW = 74

const DATA_GRID_MIN_HEIGHT = "106px"

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
}

// Native 11×9 box — sizing via fontSize puts the arrow in a square em-box,
// letterboxing it off the label's optical center
const ActionArrowIcon = (
  <SvgIcon
    component={ArrowRightIcon}
    inheritViewBox
    sx={{ width: "11px", height: "9px" }}
  />
)

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
    <GridRow {...props} onClick={handleClick} onAuxClick={handleAuxClick} />
  )
}

export const ExploreMarketsTable = () => {
  const isMobile = useMobileResolution()
  const { t } = useTranslation()
  const { marketAccounts, borrowers, isLoadingInitial, onboardingByMarket } =
    useLenderMarketsContext()
  const { isTestnet } = useCurrentNetwork()
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
  ])

  const gridWrapRef = useRef<HTMLDivElement>(null)
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

  const { rows, totalRows } = useMemo<{
    rows: GridRowsProp<LenderOtherMarketsTableModel>
    totalRows: number
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

    const sorted = [...onboardFiltered].sort((a, b) => {
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
    })

    const accountsToMap = isMobile ? sorted.slice(0, visibleMobileRows) : sorted

    return {
      totalRows: sorted.length,
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
    isMobile,
    visibleMobileRows,
  ])

  // Stable identity: a fresh columns array makes the DataGrid rebuild column
  // state and re-render every cell on each keystroke/filter/poll render
  const columns = useMemo<TypeSafeColDef<LenderOtherMarketsTableModel>[]>(
    () => [
      {
        field: "name",
        headerName: "Market",
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
            params.row.chainId,
            params.row.id,
            formatBps(params.value),
          )
          const adsCellProps = getAdsCellProps(
            params.row.chainId,
            params.row.id,
          )

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
        field: "debt",
        headerName: "Total Debt / Remaining",
        minWidth: 200,
        flex: 1.5,
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
                  top: "11px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: "6px",
                }}
              >
                <Box
                  sx={{
                    width: "120px",
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
      {
        sortable: false,
        field: "button",
        headerName: "",
        minWidth: 100,
        flex: 1,
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
                  endIcon={ActionArrowIcon}
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
                    endIcon={ActionArrowIcon}
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
    [t],
  )

  if (isMobile)
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          paddingBottom: "8px",
          backgroundColor: "transparent",
        }}
      >
        <Box
          sx={{
            backgroundColor: COLORS.white,
            borderRadius: "0 0 14px 14px",
            padding: "16px 0 12px",
            // Overlap the carousel card above by 1px: at fractional display
            // scales the flush white-on-white edge otherwise renders as a
            // hairline seam over the dark page background
            marginTop: "-1px",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0 16px",
              marginBottom: "12px",
            }}
          >
            <Typography
              sx={{ fontSize: "20px", fontWeight: 500, lineHeight: "26px" }}
            >
              Top Markets
            </Typography>

            <Box sx={{ display: "flex", gap: "4px" }}>
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

          <Box
            sx={{
              display: "flex",
              gap: "6px",
              alignItems: "center",
              padding: "0 6px",
            }}
          >
            {isLoading ? (
              <RepeatingSkeletons
                itemsLength={4}
                skeletonSX={{
                  height: "24px",
                  width: "90px",
                  borderRadius: "20px",
                }}
              />
            ) : (
              SORT_OPTIONS.map((option) => (
                <Box
                  key={option}
                  onClick={() => handleSortModeChange(option)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: sortMode === option ? "2px 10px" : "2px",
                    borderRadius: "20px",
                    backgroundColor:
                      sortMode === option ? COLORS.athensGrey : "transparent",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  <Typography
                    variant="mobText3"
                    sx={{
                      color: COLORS.blackRock,
                      fontWeight: sortMode === option ? 600 : 500,
                      whiteSpace: "nowrap",
                      lineHeight: "20px",
                    }}
                  >
                    {option}
                  </Typography>
                </Box>
              ))
            )}
          </Box>
        </Box>

        {isLoading ? (
          <RepeatingSkeletons
            itemsLength={5}
            skeletonSX={{
              height: "182px",
              borderRadius: "14px",
              backgroundColor: COLORS.white06,
            }}
          />
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            {rows.map((marketItem) => (
              <MobileMarketCard key={marketItem.id} marketItem={marketItem} />
            ))}
          </Box>
        )}

        {!isLoading &&
          totalRows > 0 &&
          (totalRows > visibleMobileRows ? (
            <Button
              type="button"
              variant="contained"
              color="secondary"
              size="large"
              fullWidth
              onClick={() =>
                setVisibleMobileRows((count) => count + EXPLORE_PAGE_SIZE)
              }
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
      <Typography
        variant="title3"
        sx={{
          display: "block",
          color: COLORS.blackRock,
          marginTop: "16px",
        }}
      >
        Top Markets
      </Typography>

      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          margin: "16px 0 18px",
        }}
      >
        <Box sx={{ display: "flex", gap: "4px" }}>
          {isLoading
            ? Array.from({ length: 4 }, (_, i) => `skeleton-row-${i}`).map(
                (key) => (
                  <Skeleton
                    key={key}
                    height="36px"
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
                    borderRadius: "20px",
                    fontWeight: sortMode === option ? 600 : 500,
                    backgroundColor:
                      sortMode === option ? COLORS.whiteSmoke : "transparent",
                  }}
                >
                  {option}
                </Button>
              ))}
        </Box>

        <Box sx={{ display: "flex", gap: "6px", alignItems: "center" }}>
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
                whiteSpace: "nowrap",
              },
            }}
          />

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

      <Box ref={gridWrapRef}>
        <MarketsTableWrapper
          marketsLength={rows.length}
          rowsLength={paginationModel.pageSize}
          isLoading={isLoading}
          noMarketsTitle="No Markets Available"
          noMarketsSubtitle="There are no markets to display at the moment."
          highlightNoMarketsBanner
        >
          <DataGrid
            disableVirtualization
            sx={DataGridSx}
            rowHeight={GRID_ROW_HEIGHT}
            rows={rows}
            columns={columns}
            columnHeaderHeight={GRID_HEADER_HEIGHT}
            slots={{ row: MarketClickableRow }}
            loading={isLoading}
            sortModel={sortModel}
            onSortModelChange={setSortModel}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[paginationModel.pageSize]}
            hideFooter
          />
        </MarketsTableWrapper>
      </Box>

      <Box
        sx={{ display: "flex", justifyContent: "center", marginTop: "18px" }}
      >
        {isLoading ? (
          <Skeleton
            height="28px"
            width="127px"
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
          >
            Go to All Markets
          </Button>
        )}
      </Box>
    </Box>
  )
}
