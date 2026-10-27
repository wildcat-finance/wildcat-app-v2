import * as React from "react"

import { Box, Tooltip } from "@mui/material"

import { GD } from "./tokens"

// Chart grammar (design language v1): flat tracks and bars, status colours
// only on state segments, 2 px reference lines that run 3 px past the track,
// labels under the bar, counts drawn as marks below 700, one 10 px caption
// naming the metric ids. No gauges, gradients or 3D.

export const Caption = ({ ids }: { ids: string[] }) => (
  <Box
    component="p"
    sx={{ margin: "6px 0 0", fontSize: "10px", color: GD.muted }}
  >
    {ids.join(" · ")}
  </Box>
)

const Legend = ({ items }: { items: { color: string; label: string }[] }) => (
  <Box
    display="flex"
    flexWrap="wrap"
    columnGap="12px"
    rowGap="4px"
    marginTop="6px"
  >
    {items.map((item) => (
      <Box key={item.label} display="inline-flex" alignItems="center" gap="4px">
        <Box
          sx={{
            width: "9px",
            height: "9px",
            borderRadius: "2px",
            background: item.color,
          }}
        />
        <Box component="span" sx={{ fontSize: "10px", color: GD.muted }}>
          {item.label}
        </Box>
      </Box>
    ))}
  </Box>
)

export type Segment = { value: number; color: string; label: string }

/** Shares of one whole on a single track; slivers keep 2 px so they exist. */
export const ShareBar = ({
  segments,
  ids,
  height = 18,
}: {
  segments: Segment[]
  ids: string[]
  height?: 14 | 18 | 22
}) => {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1
  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          height: `${height}px`,
          borderRadius: "6px",
          overflow: "hidden",
          background: GD.track,
        }}
      >
        {segments
          .filter((segment) => segment.value > 0)
          .map((segment) => (
            <Box
              key={segment.label}
              sx={{
                flex: `${segment.value / total} 0 auto`,
                minWidth: "2px",
                background: segment.color,
              }}
            />
          ))}
      </Box>
      <Legend items={segments.map(({ color, label }) => ({ color, label }))} />
      <Caption ids={ids} />
    </Box>
  )
}

/**
 * A value against a contractual limit (covenant headroom): the bar is the
 * value, the red line the limit, and the headroom is stated beside it.
 */
export const LimitBar = ({
  value,
  limit,
  valueLabel,
  limitLabel,
  ids,
}: {
  value: number
  limit: number
  valueLabel: string
  limitLabel: string
  ids: string[]
}) => {
  const scale = Math.max(limit * 1.5, value * 1.1)
  const at = (amount: number) => `${(100 * Math.min(amount, scale)) / scale}%`
  return (
    <Box>
      <Box sx={{ position: "relative", height: "18px", margin: "0 0 0 0" }}>
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background: GD.track,
            borderRadius: "6px",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: at(value),
            minWidth: value > 0 ? "2px" : 0,
            background: GD.text,
            borderRadius: "6px 0 0 6px",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            left: at(limit),
            top: "-3px",
            bottom: "-3px",
            width: "2px",
            marginLeft: "-1px",
            background: GD.pastAllowance,
          }}
        />
      </Box>
      <Box display="flex" justifyContent="space-between" marginTop="6px">
        <Box component="span" sx={{ fontSize: "10px", color: GD.text }}>
          {valueLabel}
        </Box>
        <Box
          component="span"
          sx={{ fontSize: "10px", color: GD.pastAllowance }}
        >
          {limitLabel}
        </Box>
      </Box>
      <Caption ids={ids} />
    </Box>
  )
}

export type CountGroup = { count: number; color: string; label: string }

/**
 * Counting beats percentages: under 700 events, draw them. 9 px squares for
 * deadlines, filled for this market's quantity and unfilled for the rest.
 */
export const CountedSquares = ({
  groups,
  ids,
}: {
  groups: CountGroup[]
  ids: string[]
}) => {
  const total = groups.reduce((sum, group) => sum + group.count, 0)
  if (total >= 700) {
    return (
      <ShareBar
        segments={groups.map(({ count, color, label }) => ({
          value: count,
          color,
          label,
        }))}
        ids={ids}
      />
    )
  }
  return (
    <Box>
      <Box display="flex" flexWrap="wrap" gap="2px" aria-hidden>
        {groups.flatMap((group) =>
          Array.from({ length: group.count }, (_, index) => (
            <Box
              key={`${group.label}-${index}`}
              sx={{
                width: "9px",
                height: "9px",
                borderRadius: "1px",
                background: group.color,
              }}
            />
          )),
        )}
      </Box>
      <Legend items={groups.map(({ color, label }) => ({ color, label }))} />
      <Caption ids={ids} />
    </Box>
  )
}

/** Duration buckets as bars; `compact` is the 36 px face version. */
export const Buckets = ({
  buckets,
  ids,
  compact,
}: {
  buckets: { label: string; count: number }[]
  ids?: string[]
  compact?: boolean
}) => {
  const max = Math.max(1, ...buckets.map((bucket) => bucket.count))
  const height = compact ? 36 : 96
  return (
    <Box>
      <Box
        display="flex"
        alignItems="flex-end"
        gap={compact ? "4px" : "10px"}
        height={`${height}px`}
      >
        {buckets.map((bucket) => (
          <Tooltip
            key={bucket.label}
            title={`${bucket.label}: ${bucket.count}`}
            placement="top"
          >
            <Box
              sx={{
                flex: 1,
                height: `${Math.max(
                  (height * bucket.count) / max,
                  bucket.count ? 2 : 0,
                )}px`,
                background: bucket.count ? GD.text : GD.track,
                borderRadius: "3px 3px 0 0",
              }}
            />
          </Tooltip>
        ))}
      </Box>
      {compact ? null : (
        <Box display="flex" gap="10px" marginTop="6px">
          {buckets.map((bucket) => (
            <Box
              key={bucket.label}
              flex={1}
              sx={{ fontSize: "10px", color: GD.muted }}
            >
              {bucket.label} · {bucket.count}
            </Box>
          ))}
        </Box>
      )}
      {ids ? <Caption ids={ids} /> : null}
    </Box>
  )
}

export type LateShareRow = {
  label: string
  withinGrace: number
  pastAllowance: number
  valueLabel: string
  tooltip: string
}

/**
 * Trouble over time, concentration: each market's late share of its own life
 * (rates, not lifetime totals, so age does not read as guilt).
 */
export const LateShareRows = ({
  rows,
  ids,
}: {
  rows: LateShareRow[]
  ids: string[]
}) => {
  const scale = Math.max(
    10,
    ...rows.map((row) => row.withinGrace + row.pastAllowance),
  )
  return (
    <Box>
      <Box display="flex" flexDirection="column" gap="8px">
        {rows.map((row) => (
          <Tooltip key={row.label} title={row.tooltip} placement="top-start">
            <Box
              display="grid"
              gridTemplateColumns="120px 1fr 112px"
              alignItems="center"
              gap="10px"
            >
              <Box component="span" sx={{ fontSize: "11px", color: GD.text }}>
                {row.label}
              </Box>
              <Box
                sx={{
                  display: "flex",
                  height: "14px",
                  borderRadius: "4px",
                  background: GD.track,
                  overflow: "hidden",
                }}
              >
                {row.withinGrace > 0 ? (
                  <Box
                    sx={{
                      width: `${(100 * row.withinGrace) / scale}%`,
                      minWidth: "2px",
                      background: GD.withinGrace,
                    }}
                  />
                ) : null}
                {row.pastAllowance > 0 ? (
                  <Box
                    sx={{
                      width: `${(100 * row.pastAllowance) / scale}%`,
                      minWidth: "2px",
                      background: GD.pastAllowance,
                    }}
                  />
                ) : null}
              </Box>
              <Box
                component="span"
                sx={{
                  fontSize: "11px",
                  color: GD.text,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {row.valueLabel}
              </Box>
            </Box>
          </Tooltip>
        ))}
      </Box>
      <Legend
        items={[
          { color: GD.withinGrace, label: "late within the grace period" },
          { color: GD.pastAllowance, label: "past the grace period" },
        ]}
      />
      <Caption ids={ids} />
    </Box>
  )
}

/**
 * The direction line: the only curve on the pages, 2 px amber on three
 * hairline gridlines. The record holds two points, lifetime and trailing 90
 * days, so the line joins exactly those and nothing in between.
 */
export const DirectionLine = ({
  from,
  to,
  fromLabel,
  toLabel,
  ids,
}: {
  from: number
  to: number
  fromLabel: string
  toLabel: string
  ids: string[]
}) => {
  const low = Math.max(0, Math.floor(Math.min(from, to) / 10) * 10 - 10)
  const high = Math.min(100, Math.ceil(Math.max(from, to) / 10) * 10 + 10)
  const y = (value: number) => 70 - (60 * (value - low)) / (high - low || 1)
  return (
    <Box>
      <svg
        viewBox="0 0 300 80"
        width="100%"
        height="80"
        role="img"
        aria-label={`${fromLabel} to ${toLabel}`}
      >
        {[low, (low + high) / 2, high].map((line) => (
          <line
            key={line}
            x1="0"
            x2="300"
            y1={y(line)}
            y2={y(line)}
            stroke={GD.border}
            strokeWidth="1"
          />
        ))}
        <line
          x1="20"
          x2="280"
          y1={y(from)}
          y2={y(to)}
          stroke={GD.withinGrace}
          strokeWidth="2"
        />
        <circle cx="20" cy={y(from)} r="3" fill={GD.withinGrace} />
        <circle cx="280" cy={y(to)} r="3" fill={GD.withinGrace} />
      </svg>
      <Box display="flex" justifyContent="space-between">
        <Box component="span" sx={{ fontSize: "10px", color: GD.text }}>
          {fromLabel}
        </Box>
        <Box component="span" sx={{ fontSize: "10px", color: GD.text }}>
          {toLabel}
        </Box>
      </Box>
      <Caption ids={ids} />
    </Box>
  )
}
