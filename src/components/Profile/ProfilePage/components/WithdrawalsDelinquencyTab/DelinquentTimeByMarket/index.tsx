"use client"

import * as React from "react"

import { Box, Button, Divider, SvgIcon, Typography } from "@mui/material"
import Link from "next/link"

import { BorrowerDelinquencyEvent } from "@/app/[locale]/borrower/profile/hooks/analytics/types"
import {
  ProfileHealthChipsRowSx,
  profileHealthChipSx,
} from "@/app/[locale]/lender/profile/components/LenderProfileOverviewTab/ProfileHealthTable/style"
import PendingIcon from "@/assets/icons/chipEmptyGrey_icon.svg"
import PenaltyIcon from "@/assets/icons/chipYellowAlert_icon.svg"
import ChevronIcon from "@/assets/icons/upArrow_icon.svg"
import { EmptyPanel } from "@/components/Profile/shared/AnalyticsPanels"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { buildMarketHref } from "@/utils/formatters"

const DAY_SECONDS = 86_400
const VISIBLE_COUNT = 5
const PENALTY_BAR_COLOR = COLORS.lemonPie
const GRACE_BAR_COLOR = COLORS.iron
const PENALTY_CHIP_BG = "#FCF5E1"

type DelinquencyFilter = "ongoing" | "all"

type DelinquencyRow = {
  id: number
  marketId: string
  marketName: string
  days: number
  durationHours: number
  ongoing: boolean
  penalized: boolean
  graceRemainingDays: number
}

const buildRows = (
  events: BorrowerDelinquencyEvent[],
  gracePeriodMap: Record<string, number>,
): DelinquencyRow[] =>
  events
    .map((event) => {
      const ongoing = event.endTimestamp === null
      const graceSeconds = gracePeriodMap[event.marketId] ?? 0
      const remainingSeconds = graceSeconds - event.durationHours * 3600

      return {
        id: event.id,
        marketId: event.marketId,
        marketName: event.marketName,
        days: Math.round(event.durationHours / 24),
        durationHours: event.durationHours,
        ongoing,
        penalized: event.penalized,
        graceRemainingDays: Math.max(
          0,
          Math.ceil(remainingSeconds / DAY_SECONDS),
        ),
      }
    })
    .sort((left, right) => right.durationHours - left.durationHours)

const StatusChip = ({ row }: { row: DelinquencyRow }) => {
  if (row.penalized) {
    return (
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: "2px",
          padding: "2px 6px 2px 4px",
          borderRadius: "12px",
          backgroundColor: PENALTY_CHIP_BG,
          flexShrink: 0,
        }}
      >
        <SvgIcon component={PenaltyIcon} sx={{ fontSize: "12px" }} />
        <Typography variant="text4" color={COLORS.butteredRum} noWrap>
          Got penalty
        </Typography>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: "2px",
        padding: "2px 6px 2px 4px",
        borderRadius: "12px",
        backgroundColor: COLORS.blackHaze,
        flexShrink: 0,
      }}
    >
      <SvgIcon component={PendingIcon} sx={{ fontSize: "12px" }} />
      <Typography variant="text4" color={COLORS.matteSilver} noWrap>
        {row.ongoing ? `${row.graceRemainingDays}d till penalty` : "Cured"}
      </Typography>
    </Box>
  )
}

const DelinquencyBarRow = ({
  row,
  maxHours,
  chainId,
}: {
  row: DelinquencyRow
  maxHours: number
  chainId?: number
}) => {
  const widthPct = maxHours > 0 ? (row.durationHours / maxHours) * 100 : 0

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: "16px",
        padding: "10px 0",
      }}
    >
      <Typography
        variant="text3"
        sx={{
          width: "200px",
          flexShrink: 0,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}
      >
        {row.marketName}
      </Typography>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box
          sx={{
            width: `${Math.max(2, widthPct)}%`,
            height: "4px",
            borderRadius: "2px",
            backgroundColor: row.penalized
              ? PENALTY_BAR_COLOR
              : GRACE_BAR_COLOR,
          }}
        />
      </Box>

      <Typography
        variant="text3"
        sx={{ width: "52px", flexShrink: 0, textAlign: "right" }}
      >
        {row.days}d
      </Typography>

      <Box sx={{ width: "130px", flexShrink: 0 }}>
        <StatusChip row={row} />
      </Box>

      <Button
        component={Link}
        href={buildMarketHref(row.marketId, chainId, ROUTES.borrower.market)}
        variant="contained"
        size="small"
        sx={{
          flexShrink: 0,
          backgroundColor: COLORS.whiteSmoke,
          color: COLORS.blackRock,
          boxShadow: "none",
          "&:hover": { backgroundColor: COLORS.athensGrey, boxShadow: "none" },
        }}
      >
        Repay
      </Button>
    </Box>
  )
}

export const DelinquentTimeByMarket = ({
  events,
  gracePeriodMap,
  chainId,
}: {
  events: BorrowerDelinquencyEvent[]
  gracePeriodMap: Record<string, number>
  chainId?: number
}) => {
  const [filter, setFilter] = React.useState<DelinquencyFilter>("ongoing")
  const [expanded, setExpanded] = React.useState(false)

  const allRows = React.useMemo(
    () => buildRows(events, gracePeriodMap),
    [events, gracePeriodMap],
  )
  const ongoingCount = React.useMemo(
    () => allRows.filter((row) => row.ongoing).length,
    [allRows],
  )

  const rows = React.useMemo(
    () =>
      filter === "ongoing" ? allRows.filter((row) => row.ongoing) : allRows,
    [allRows, filter],
  )

  const maxHours = React.useMemo(
    () => rows.reduce((max, row) => Math.max(max, row.durationHours), 0),
    [rows],
  )

  const visibleRows = expanded ? rows : rows.slice(0, VISIBLE_COUNT)

  const filters: Array<{
    value: DelinquencyFilter
    label: string
    count?: number
    icon?: boolean
  }> = [
    { value: "ongoing", label: "Ongoing", count: ongoingCount, icon: true },
    { value: "all", label: "All" },
  ]

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          marginBottom: "24px",
        }}
      >
        {filters.map((item) => {
          const isActive = item.value === filter
          return (
            <Box
              key={item.value}
              component="button"
              type="button"
              onClick={() => {
                setFilter(item.value)
                setExpanded(false)
              }}
              sx={{
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "transparent",
                typography: "text3",
                color: COLORS.blackRock,
                fontWeight: 600,
                padding: "4px 12px",
                borderRadius: "20px",
                border: `1px solid ${
                  isActive ? COLORS.blackRock : COLORS.whiteLilac
                }`,
              }}
            >
              {item.icon && (
                <SvgIcon component={PendingIcon} sx={{ fontSize: "16px" }} />
              )}
              {item.label}
              {item.count !== undefined && (
                <Typography
                  variant="text3"
                  component="span"
                  color={COLORS.santasGrey}
                >
                  {item.count}
                </Typography>
              )}
            </Box>
          )
        })}
      </Box>

      {rows.length === 0 ? (
        <EmptyPanel message="No delinquency events found for this borrower." />
      ) : (
        <>
          {visibleRows.map((row) => (
            <>
              <Divider />
              <DelinquencyBarRow
                key={row.id}
                row={row}
                maxHours={maxHours}
                chainId={chainId}
              />
            </>
          ))}
          <Divider />

          {rows.length > VISIBLE_COUNT && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                marginTop: "12px",
              }}
            >
              <Button
                type="button"
                variant="text"
                onClick={() => setExpanded((value) => !value)}
                startIcon={
                  <SvgIcon
                    component={ChevronIcon}
                    sx={{
                      fontSize: "10px",
                      transform: expanded ? "rotate(180deg)" : "none",
                      transition: "transform 0.2s ease",
                      "& path": { fill: COLORS.ultramarineBlue },

                      "&:hover": {
                        "& path": { fill: COLORS.ultramarineBlue },
                      },
                    }}
                  />
                }
                sx={{
                  color: COLORS.ultramarineBlue,
                  typography: "text3",
                  "&:hover": {
                    color: COLORS.ultramarineBlue,
                    backgroundColor: "transparent",
                  },
                }}
              >
                {expanded ? "Show less" : "Show more"}
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  )
}
