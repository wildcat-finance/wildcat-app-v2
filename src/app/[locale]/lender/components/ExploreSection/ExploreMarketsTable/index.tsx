"use client"

import { useMemo, useState } from "react"
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
import {
  DepositStatus,
  MarketVersion,
  TokenAmount,
} from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { TypeSafeColDef } from "@/app/[locale]/borrower/components/MarketsSection/сomponents/MarketsTables/interface"
import { LinkCell } from "@/app/[locale]/borrower/components/MarketsTables/style"
import { useLenderMarketsContext } from "@/app/[locale]/lender/context"
import { useMarketsWithRecentInflow } from "@/app/[locale]/lender/hooks/useMarketsWithRecentInflow"
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
import { ExploreMarketCard } from "@/components/Mobile/ExploreMarketCard"
import { MobileFilterButton } from "@/components/Mobile/MobileFilterButton"
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
import { compareByHighestYield } from "@/utils/marketSort"
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

const statusFilterOptions = marketStatusesMock.filter(
  (option) => option.id !== MarketStatus.PENALTY,
)

const EXPLORE_PAGE_SIZE = 5

const GRID_ROW_HEIGHT = 66
const GRID_HEADER_HEIGHT = 40

const PAGINATION_MODEL = { page: 0, pageSize: EXPLORE_PAGE_SIZE }

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
  chainId?: number
  status: ReturnType<typeof getMarketStatusChip>
  term: ReturnType<typeof getMarketTypeChip>
  name: string
  borrower: string | undefined
  borrowerAddress: string | undefined
  asset: string
  debt: TokenAmount | undefined
  apr: number
  withdrawalBatchDuration: number
  isSelfOnboard: boolean
  button?: string
  capacityLeft: TokenAmount
}

const MarketLinkRow = (props: GridRowProps) => (
  <Link
    href={buildMarketHref(props.row.id, props.row.chainId)}
    style={{ display: "contents", color: "inherit" }}
    tabIndex={-1}
  >
    <GridRow {...props} />
  </Link>
)

export const ExploreMarketsTable = () => {
  const isMobile = useMobileResolution()
  const { t } = useTranslation()
  const { marketAccounts, borrowers, isLoadingInitial, isLoadingUpdate } =
    useLenderMarketsContext()
  const { isTestnet } = useCurrentNetwork()
  const { isMarketQualifying, isLoading: isInflowLoading } =
    useMarketsWithRecentInflow()

  const isLoading = isLoadingInitial || isLoadingUpdate || isInflowLoading

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
    const gateActive = search.trim() === ""
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
    ).filter((a) => {
      if (!gateActive) return !a.market.isClosed
      return (
        isExploreVisible(a.market) &&
        isMarketQualifying(a) &&
        !penaltyBorrowers.has(a.market.borrower.toLowerCase())
      )
    })

    const onboardFiltered = filtered.filter((account) => {
      if (!gateActive) return true

      const isSelf =
        !account.hasEverInteracted &&
        account.market.version === MarketVersion.V2 &&
        account.depositAvailability === DepositStatus.Ready

      if (isSelf) return showSelfOnboard
      return showOnboardByBorrower
    })

    const sorted = [...onboardFiltered].sort((a, b) => {
      if (sortMode === "Highest Yield") {
        return compareByHighestYield(a, b)
      }
      if (sortMode === "Most Liquid") {
        const capA = a.market.maxTotalSupply.sub(a.market.totalSupply)
        const capB = b.market.maxTotalSupply.sub(b.market.totalSupply)
        return tokenAmountComparator(capB, capA)
      }
      if (sortMode === "Newest") {
        return (
          (b.market.deployedEvent?.blockTimestamp ?? 0) -
          (a.market.deployedEvent?.blockTimestamp ?? 0)
        )
      }
      return tokenAmountComparator(b.market.totalSupply, a.market.totalSupply)
    })

    return sorted.map((account) => {
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
    isLoadingUpdate,
    isMarketQualifying,
  ])

  const columns: TypeSafeColDef<LenderOtherMarketsTableModel>[] = [
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
      field: "debt",
      headerName: "Total Debt / Remaining",
      minWidth: 200,
      flex: 1.5,
      headerAlign: "right",
      align: "right",
      sortComparator: tokenAmountComparator,
      renderCell: (
        params: GridRenderCellParams<LenderOtherMarketsTableModel, TokenAmount>,
      ) => {
        const { capacityLeft } = params.row
        const debtRaw = params.value ? params.value.raw.toBigInt() : BigInt(0)
        // capacityLeft can go negative when a borrower shrinks capacity below
        // the current supply, so clamp the fill to 0-100%
        const totalRaw = debtRaw + capacityLeft.raw.toBigInt()
        const debtPct =
          totalRaw > BigInt(0)
            ? Math.min(100, Number((debtRaw * BigInt(10000)) / totalRaw) / 100)
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
      renderCell: (params) => (
        <Box sx={{ ...LinkCell, justifyContent: "flex-end" }}>
          {params.row.isSelfOnboard ? (
            <Button
              size="small"
              variant="contained"
              color="secondary"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              endIcon={
                <SvgIcon
                  component={ArrowRightIcon}
                  inheritViewBox
                  sx={{ fontSize: "11px" }}
                />
              }
            >
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

  if (isMobile)
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          padding: "16px 8px 8px",
          borderRadius: "14px",
          backgroundColor: COLORS.white,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "4px",
          }}
        >
          <Box
            sx={{
              display: "flex",
              gap: "6px",
              alignItems: "center",
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
                      sortMode === option ? COLORS.blackRock : "transparent",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  <Typography
                    variant="mobText3"
                    sx={{
                      color:
                        sortMode === option ? COLORS.white : COLORS.blackRock,
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
              marketAccounts={marketAccounts.filter((a) => !a.market.isClosed)}
              marketSearch={search}
              setMarketSearch={setSearch}
              isExplorePage
            />
          </Box>
        </Box>

        {isLoading ? (
          <RepeatingSkeletons
            itemsLength={5}
            skeletonSX={{
              height: "86px",
              borderRadius: "12px",
              marginBottom: "6px",
              "&:last-of-type": {
                marginBottom: "0",
              },
            }}
          />
        ) : (
          rows
            .slice(0, EXPLORE_PAGE_SIZE)
            .map((marketItem, index, visibleRows) => (
              <ExploreMarketCard
                key={marketItem.id}
                marketItem={marketItem}
                isLast={index === visibleRows.length - 1}
              />
            ))
        )}

        <Box sx={{ padding: "10px 8px 4px" }}>
          <Button
            component={Link}
            href="/lender/all-markets"
            variant="contained"
            color="secondary"
            size="small"
            fullWidth
          >
            Go to All Markets
          </Button>
        </Box>
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

      <MarketsTableWrapper
        marketsLength={rows.length}
        rowsLength={EXPLORE_PAGE_SIZE}
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
          slots={{ row: MarketLinkRow }}
          loading={isLoading}
          sortModel={sortModel}
          onSortModelChange={setSortModel}
          paginationModel={PAGINATION_MODEL}
          pageSizeOptions={[EXPLORE_PAGE_SIZE]}
          hideFooter
        />
      </MarketsTableWrapper>

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
