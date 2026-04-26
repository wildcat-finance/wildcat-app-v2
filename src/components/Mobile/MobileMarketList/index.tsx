import React, { useMemo, useState } from "react"

import {
  Box,
  Button,
  Chip,
  IconButton,
  ListItemText,
  Menu,
  MenuItem,
  Skeleton,
  SvgIcon,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material"
import { HooksKind } from "@wildcatfi/wildcat-sdk"
import { usePathname } from "next/navigation"

import FilterIcon from "@/assets/icons/filter_icon.svg"
import SortAscIcon from "@/assets/icons/tableSort-ascSort_icon.svg"
import SortDescIcon from "@/assets/icons/tableSort-descSort_icon.svg"
import { getAdsMobileContent } from "@/components/AdsBanners/adsHelpers"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { MarketStatus } from "@/utils/marketStatus"

import {
  MobileMarketCard,
  MobileMarketCardVariant,
  MobileMarketItem,
} from "../MobileMarketCard"

const ITEMS_PER_PAGE = 20

type SortField = "debt" | "apr" | "capacity" | "withdrawal" | "name"
type SortDir = "desc" | "asc"
type StatusFilter = "all" | "healthy" | "issues"
type TermFilter = "all" | "open" | "fixed"

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "debt", label: "Total debt" },
  { value: "apr", label: "Base APR" },
  { value: "capacity", label: "Capacity left" },
  { value: "withdrawal", label: "Withdrawal cycle" },
  { value: "name", label: "Name" },
]

const stripAssetSuffix = (name: string, asset: string) => {
  const suffix = ` ${asset}`
  return name.toLowerCase().endsWith(suffix.toLowerCase())
    ? name.slice(0, -suffix.length)
    : name
}

const sortRows = (
  rows: MobileMarketItem[],
  field: SortField,
  dir: SortDir,
): MobileMarketItem[] => {
  const sign = dir === "desc" ? -1 : 1
  const compare = (a: MobileMarketItem, b: MobileMarketItem) => {
    switch (field) {
      case "debt": {
        const aRaw = a.debt?.raw
        const bRaw = b.debt?.raw
        if (!aRaw && !bRaw) return 0
        if (!aRaw) return 1 * sign
        if (!bRaw) return -1 * sign
        if (aRaw.eq(bRaw)) return 0
        return aRaw.gt(bRaw) ? 1 * sign : -1 * sign
      }
      case "apr":
        return (a.apr - b.apr) * sign
      case "capacity": {
        const aRaw = a.capacityLeft?.raw
        const bRaw = b.capacityLeft?.raw
        if (!aRaw && !bRaw) return 0
        if (!aRaw) return 1 * sign
        if (!bRaw) return -1 * sign
        if (aRaw.eq(bRaw)) return 0
        return aRaw.gt(bRaw) ? 1 * sign : -1 * sign
      }
      case "withdrawal":
        return (a.withdrawalBatchDuration - b.withdrawalBatchDuration) * sign
      case "name":
        return a.name.localeCompare(b.name) * sign
      default:
        return 0
    }
  }
  return [...rows].sort(compare)
}

const getPaginationRange = (page: number, totalPages: number) => {
  const range: (number | "...")[] = []

  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i)
  }

  range.push(0)

  if (page > 2) {
    range.push("...")
  }

  for (
    let i = Math.max(1, page - 1);
    i <= Math.min(totalPages - 2, page + 1);
    // eslint-disable-next-line no-plusplus
    i++
  ) {
    range.push(i)
  }

  if (page < totalPages - 3) {
    range.push("...")
  }

  range.push(totalPages - 1)

  return range
}

const FilterChip = ({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) => (
  <Chip
    label={label}
    onClick={onClick}
    size="small"
    sx={{
      backgroundColor: selected ? COLORS.glitter : COLORS.whiteSmoke,
      color: selected ? COLORS.ultramarineBlue : COLORS.blackRock,
      fontWeight: selected ? 600 : 400,
      "&:hover": {
        backgroundColor: selected ? COLORS.glitter : COLORS.whiteSmoke,
      },
    }}
  />
)

const segmentedSx = {
  flex: 1,
  minWidth: 0,
  "& .MuiToggleButton-root": {
    flex: 1,
    padding: "5px 8px",
    fontSize: "12px",
    lineHeight: "16px",
    textTransform: "none" as const,
    color: COLORS.santasGrey,
    border: `1px solid ${COLORS.athensGrey}`,
    fontWeight: 500,
    "&.Mui-selected": {
      backgroundColor: COLORS.glitter,
      color: COLORS.ultramarineBlue,
      fontWeight: 600,
      borderColor: COLORS.glitter,
      "&:hover": { backgroundColor: COLORS.glitter },
    },
    "&:hover": { backgroundColor: COLORS.whiteSmoke },
  },
}

export const MobileMarketList = ({
  markets,
  isLoading,
  variant = "lender-action",
  groupByAsset = false,
  enableToolbar = false,
}: {
  markets: MobileMarketItem[]
  isLoading: boolean
  variant?: MobileMarketCardVariant
  groupByAsset?: boolean
  enableToolbar?: boolean
}) => {
  const [page, setPage] = useState(0)
  const [sortField, setSortField] = useState<SortField>(
    variant === "borrower-context" ? "debt" : "name",
  )
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [termFilter, setTermFilter] = useState<TermFilter>("all")
  const [assetFilter, setAssetFilter] = useState<Set<string>>(new Set())
  const [sortMenuAnchor, setSortMenuAnchor] = useState<HTMLElement | null>(null)
  const pathname = usePathname()

  const isBorrowerProfilePage =
    pathname.includes(ROUTES.borrower.profile) ||
    pathname.includes(ROUTES.profile.borrower)
  const isLenderProfilePage = pathname.includes(ROUTES.lender.profile)

  const showBorrowerInCard = !isBorrowerProfilePage && !isLenderProfilePage

  const uniqueAssets = useMemo(
    () => Array.from(new Set(markets.map((m) => m.asset))).sort(),
    [markets],
  )

  const filteredSorted = useMemo(() => {
    let rows = markets
    if (statusFilter !== "all") {
      rows = rows.filter((m) => {
        const isHealthy = m.status.status === MarketStatus.HEALTHY
        return statusFilter === "healthy" ? isHealthy : !isHealthy
      })
    }
    if (termFilter !== "all") {
      rows = rows.filter((m) => {
        const isOpen = m.term.kind === HooksKind.OpenTerm
        return termFilter === "open" ? isOpen : !isOpen
      })
    }
    if (assetFilter.size > 0) {
      rows = rows.filter((m) => assetFilter.has(m.asset))
    }
    return sortRows(rows, sortField, sortDir)
  }, [markets, statusFilter, termFilter, assetFilter, sortField, sortDir])

  const grouped = groupByAsset && assetFilter.size !== 1
  const orderedRows = useMemo(() => {
    if (!grouped) return filteredSorted
    // stable secondary sort: bring same-asset rows together while preserving the
    // primary sort order within each asset bucket
    const buckets = new Map<string, MobileMarketItem[]>()
    filteredSorted.forEach((row) => {
      const list = buckets.get(row.asset) ?? []
      list.push(row)
      buckets.set(row.asset, list)
    })
    return Array.from(buckets.keys())
      .sort()
      .flatMap((asset) => buckets.get(asset) ?? [])
  }, [filteredSorted, grouped])

  const totalPages = Math.max(1, Math.ceil(orderedRows.length / ITEMS_PER_PAGE))
  const safePage = Math.min(page, totalPages - 1)
  const startIndex = safePage * ITEMS_PER_PAGE
  const currentItems = orderedRows.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  )

  const handlePrev = () => setPage((prev) => Math.max(prev - 1, 0))
  const handleNext = () => setPage((prev) => Math.min(prev + 1, totalPages - 1))

  const paginationItems = getPaginationRange(safePage, totalPages)

  const toggleAsset = (asset: string) => {
    setAssetFilter((prev) => {
      const next = new Set(prev)
      if (next.has(asset)) next.delete(asset)
      else next.add(asset)
      return next
    })
    setPage(0)
  }

  const toggleSortDir = () =>
    setSortDir((prev) => (prev === "desc" ? "asc" : "desc"))

  const onLightSurface = variant === "borrower-context"

  const currentSortLabel =
    SORT_OPTIONS.find((o) => o.value === sortField)?.label ?? ""

  const toolbar = enableToolbar && !isLoading && markets.length > 0 && (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        padding: "8px 0 16px",
      }}
    >
      <Box sx={{ display: "flex", gap: "8px" }}>
        <ToggleButtonGroup
          value={statusFilter}
          exclusive
          size="small"
          onChange={(_, v) => {
            if (v) {
              setStatusFilter(v as StatusFilter)
              setPage(0)
            }
          }}
          sx={segmentedSx}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="healthy">Healthy</ToggleButton>
          <ToggleButton value="issues">Issues</ToggleButton>
        </ToggleButtonGroup>

        <ToggleButtonGroup
          value={termFilter}
          exclusive
          size="small"
          onChange={(_, v) => {
            if (v) {
              setTermFilter(v as TermFilter)
              setPage(0)
            }
          }}
          sx={segmentedSx}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="open">Open</ToggleButton>
          <ToggleButton value="fixed">Fixed</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        {uniqueAssets.length > 1 && (
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              flex: 1,
            }}
          >
            {uniqueAssets.map((asset) => (
              <FilterChip
                key={asset}
                label={asset}
                selected={assetFilter.has(asset)}
                onClick={() => toggleAsset(asset)}
              />
            ))}
          </Box>
        )}

        <Box
          sx={{
            display: "flex",
            gap: "4px",
            marginLeft: uniqueAssets.length > 1 ? "auto" : 0,
          }}
        >
          <Tooltip title={`Sort by ${currentSortLabel}`} placement="top">
            <IconButton
              size="small"
              onClick={(e) => setSortMenuAnchor(e.currentTarget)}
              sx={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                backgroundColor: COLORS.whiteSmoke,
                "&:hover": { backgroundColor: COLORS.athensGrey },
              }}
            >
              <SvgIcon
                sx={{
                  fontSize: "18px",
                  "& path": { stroke: COLORS.blackRock },
                }}
              >
                <FilterIcon />
              </SvgIcon>
            </IconButton>
          </Tooltip>
          <Tooltip
            title={sortDir === "desc" ? "Descending" : "Ascending"}
            placement="top"
          >
            <IconButton
              size="small"
              onClick={toggleSortDir}
              sx={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                backgroundColor: COLORS.whiteSmoke,
                "&:hover": { backgroundColor: COLORS.athensGrey },
              }}
            >
              <SvgIcon
                viewBox="0 0 8 8"
                sx={{ fontSize: "14px", "& path": { fill: COLORS.blackRock } }}
              >
                {sortDir === "desc" ? <SortDescIcon /> : <SortAscIcon />}
              </SvgIcon>
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Menu
        anchorEl={sortMenuAnchor}
        open={Boolean(sortMenuAnchor)}
        onClose={() => setSortMenuAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {SORT_OPTIONS.map((opt) => (
          <MenuItem
            key={opt.value}
            selected={opt.value === sortField}
            onClick={() => {
              setSortField(opt.value)
              setPage(0)
              setSortMenuAnchor(null)
            }}
          >
            <ListItemText primary={opt.label} />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  )

  if (!markets.length && !isLoading)
    return (
      <Box
        sx={{
          width: "100%",
          height: "155px",
          backgroundColor: COLORS.white,
          padding: "12px",
          borderRadius: "14px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          marginTop: "4px",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Typography variant="mobH3">No Markets Here</Typography>
        <Typography variant="mobText3" color={COLORS.santasGrey}>
          Change selected filters or check other sections
        </Typography>
      </Box>
    )

  let lastAsset: string | null = null

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        marginTop: "4px",
      }}
    >
      {toolbar}

      <Box
        sx={{
          height: "100%",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {!isLoading && currentItems.length === 0 && (
          <Box
            sx={{
              width: "100%",
              padding: "24px 12px",
              backgroundColor: COLORS.white,
              borderRadius: "14px",
              textAlign: "center",
            }}
          >
            <Typography variant="mobText3" color={COLORS.santasGrey}>
              No markets match the current filters.
            </Typography>
          </Box>
        )}
        {!isLoading &&
          currentItems.map((marketItem) => {
            const showAssetHeader = grouped && marketItem.asset !== lastAsset
            const headerLabel = showAssetHeader
              ? (() => {
                  const count = orderedRows.filter(
                    (m) => m.asset === marketItem.asset,
                  ).length
                  return `${marketItem.asset} · ${count} market${
                    count === 1 ? "" : "s"
                  }`
                })()
              : null
            lastAsset = marketItem.asset
            const displayName = grouped
              ? stripAssetSuffix(marketItem.name, marketItem.asset)
              : marketItem.name
            return (
              <React.Fragment key={marketItem.id}>
                {showAssetHeader && (
                  <Typography
                    variant="mobText4"
                    color={COLORS.santasGrey}
                    sx={{
                      paddingLeft: "4px",
                      paddingTop: "8px",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {headerLabel}
                  </Typography>
                )}
                <MobileMarketCard
                  adsComponent={getAdsMobileContent(marketItem.id)}
                  marketItem={marketItem}
                  buttonText={
                    variant === "lender-action" ? "Deposit" : undefined
                  }
                  buttonIcon={variant === "lender-action"}
                  showBorrower={showBorrowerInCard}
                  variant={variant}
                  displayName={displayName}
                />
              </React.Fragment>
            )
          })}
        {isLoading && (
          <>
            <Skeleton
              sx={{
                width: "100%",
                height: "155px",
                backgroundColor: COLORS.white06,
                borderRadius: "14px",
              }}
            />
            <Skeleton
              sx={{
                width: "100%",
                height: "155px",
                backgroundColor: COLORS.white06,
                borderRadius: "14px",
              }}
            />
            <Skeleton
              sx={{
                width: "100%",
                height: "155px",
                backgroundColor: COLORS.white06,
                borderRadius: "14px",
              }}
            />
          </>
        )}
      </Box>

      {!isLoading && ITEMS_PER_PAGE < orderedRows.length && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 12px 16px",
          }}
        >
          <Button
            variant="contained"
            color="secondary"
            size="small"
            onClick={handlePrev}
            disabled={safePage === 0}
            sx={{
              minWidth: "fit-content",
              "&.Mui-disabled": {
                backgroundColor: onLightSurface
                  ? COLORS.whiteSmoke
                  : COLORS.white03,
                color: onLightSurface ? COLORS.santasGrey : COLORS.white,
              },
              padding: "6px 14px",
              borderRadius: "8px",
            }}
          >
            Prev
          </Button>

          <Box sx={{ display: "flex", gap: "8px" }}>
            {paginationItems.map((item) => {
              if (item === "...") {
                return (
                  <Box
                    key={`ellipsis-${item}`}
                    sx={{
                      width: "24px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: onLightSurface ? COLORS.santasGrey : COLORS.white,
                      fontSize: "14px",
                    }}
                  >
                    ...
                  </Box>
                )
              }

              return (
                <Button
                  key={item}
                  onClick={() => setPage(item)}
                  sx={{
                    minWidth: "24px !important",
                    width: "24px !important",
                    padding: "2px !important",
                    borderRadius: "8px",
                    backgroundColor:
                      // eslint-disable-next-line no-nested-ternary
                      item === safePage
                        ? onLightSurface
                          ? COLORS.whiteSmoke
                          : COLORS.white03
                        : "transparent",

                    "&:hover": {
                      backgroundColor: onLightSurface
                        ? COLORS.whiteSmoke
                        : COLORS.white03,
                    },
                  }}
                >
                  <Typography
                    variant="text3"
                    color={onLightSurface ? COLORS.blackRock : COLORS.white}
                  >
                    {item + 1}
                  </Typography>
                </Button>
              )
            })}
          </Box>

          <Button
            variant="contained"
            color="secondary"
            size="small"
            onClick={handleNext}
            disabled={safePage === totalPages - 1}
            sx={{
              minWidth: "fit-content",
              "&.Mui-disabled": {
                backgroundColor: onLightSurface
                  ? COLORS.whiteSmoke
                  : COLORS.white03,
                color: onLightSurface ? COLORS.santasGrey : COLORS.white,
              },
              padding: "6px 14px",
              borderRadius: "8px",
            }}
          >
            Next
          </Button>
        </Box>
      )}
    </Box>
  )
}
