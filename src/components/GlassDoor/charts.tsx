import * as React from "react"

import { Box, Tooltip } from "@mui/material"

import type { Comparison } from "./api"
import { count } from "./format"
import { GD } from "./tokens"

// Labels carry the data; colour never supplies a verdict by itself. IDs remain
// available to inspection tools without becoming product copy.
const positive = (value: number) =>
  Number.isFinite(value) ? Math.max(0, value) : 0
const share = (value: number, scale: number) =>
  `${Math.min(100, (100 * positive(value)) / scale)}%`

// Chart grammar: a reference line is 2 px and extends 3 px past its track.
const Reference = ({
  at,
  color,
  dashed = false,
}: {
  at: string
  color: string
  dashed?: boolean
}) => (
  <Box
    aria-hidden
    sx={{
      position: "absolute",
      left: `calc(${at} - 1px)`,
      top: -3,
      bottom: -3,
      width: "2px",
      borderRadius: "1px",
      background: dashed
        ? `repeating-linear-gradient(${color} 0 3px, transparent 3px 5px)`
        : color,
    }}
  />
)

const Caption = ({ children }: { children: React.ReactNode }) => (
  <Box
    sx={{
      marginTop: "8px",
      fontSize: "11px",
      lineHeight: 1.4,
      color: GD.muted,
      fontVariantNumeric: "tabular-nums",
      overflowWrap: "anywhere",
    }}
  >
    {children}
  </Box>
)

const Legend = ({
  items,
}: {
  items: { color: string; label: string; outline?: boolean }[]
}) => (
  <Box display="flex" flexWrap="wrap" gap="8px 16px" marginTop="12px">
    {items.map((item) => (
      <Box key={item.label} display="inline-flex" alignItems="center" gap="6px">
        <Box
          aria-hidden
          sx={{
            width: 9,
            height: 9,
            boxSizing: "border-box",
            borderRadius: "2px",
            background: item.outline ? "none" : item.color,
            border: item.outline ? `1px solid ${item.color}` : 0,
            flexShrink: 0,
          }}
        />
        <Box component="span" sx={{ fontSize: "12px", color: GD.text }}>
          {item.label}
        </Box>
      </Box>
    ))}
  </Box>
)

/** Treatment C: a 0–100 rail; the median is a black tick. */
export const Rail = ({
  value,
  median,
  label,
  ids,
  size = "card",
  caption,
}: {
  value: number
  median?: number
  label: string
  ids: string[]
  size?: "cell" | "card" | "panel"
  caption?: React.ReactNode
}) => {
  const height = { cell: 6, card: 8, panel: 14 }[size]
  return (
    <Box
      data-metric-ids={ids.join(" ")}
      sx={{ width: size === "cell" ? 56 : "100%", flexShrink: 0 }}
    >
      <Box
        role="img"
        aria-label={label}
        sx={{
          position: "relative",
          height,
          borderRadius: height / 2,
          background: GD.trackInBox,
        }}
      >
        <Box
          sx={{
            width: share(value, 100),
            minWidth: value > 0 ? 2 : 0,
            height: "100%",
            borderRadius: height / 2,
            background: GD.thisOne,
          }}
        />
        {median !== undefined && (
          <Reference at={share(median, 100)} color={GD.ink} />
        )}
      </Box>
      {size === "panel" && (
        <Box
          aria-hidden
          display="flex"
          justifyContent="space-between"
          marginTop="6px"
          sx={{ fontSize: "10px", color: GD.muted }}
        >
          <span>0</span>
          <span>100</span>
        </Box>
      )}
      {caption ? <Caption>{caption}</Caption> : null}
    </Box>
  )
}

/**
 * Treatment M: an observed length against a contractual limit, headroom
 * stated. Time short of cash is amber; the part beyond the limit is red.
 */
export const Headroom = ({
  value,
  limit,
  label,
  headroom,
  ids,
  compact = false,
  valueLabel,
  limitLabel,
}: {
  value: number
  limit: number
  label: string
  headroom: string
  ids: string[]
  compact?: boolean
  valueLabel?: string
  limitLabel?: string
}) => {
  const scale = Math.max(1, positive(limit) * 1.15, positive(value) * 1.05)
  const within = Math.min(positive(value), positive(limit))
  const past = positive(value - limit)
  const height = compact ? 8 : 14
  return (
    <Box data-metric-ids={ids.join(" ")}>
      <Box
        role="img"
        aria-label={`${label}; ${headroom}`}
        sx={{
          position: "relative",
          display: "flex",
          height,
          borderRadius: height / 2,
          background: GD.trackInBox,
        }}
      >
        <Box
          sx={{
            width: share(within, scale),
            minWidth: within > 0 ? 2 : 0,
            borderRadius:
              past > 0 ? `${height / 2}px 0 0 ${height / 2}px` : height / 2,
            background: GD.withinGrace,
          }}
        />
        {past > 0 && (
          <Box
            sx={{
              width: share(past, scale),
              minWidth: 2,
              borderRadius: `0 ${height / 2}px ${height / 2}px 0`,
              background: GD.pastAllowance,
            }}
          />
        )}
        <Reference at={share(limit, scale)} color={GD.pastAllowance} />
      </Box>
      {compact ? (
        <Caption>{headroom}</Caption>
      ) : (
        <Box
          display="flex"
          justifyContent="space-between"
          flexWrap="wrap"
          gap="4px 12px"
          marginTop="10px"
          sx={{
            fontSize: "12px",
            color: GD.text,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <span>{valueLabel}</span>
          <span>{limitLabel}</span>
          <Box
            component="span"
            sx={{
              flexBasis: "100%",
              fontWeight: 600,
              color: past > 0 ? GD.stateBad : GD.text,
            }}
          >
            {headroom}
          </Box>
        </Box>
      )}
    </Box>
  )
}

/**
 * Treatment E: one bar per graded member, weakest to strongest. Neighbour
 * values are not published, so only this one's position is drawn.
 */
export const RankStrip = ({
  position,
  population,
  label,
}: {
  position: number
  population: number
  label: string
}) => {
  const members = Math.max(1, Math.round(population))
  const at = Math.min(members - 1, Math.max(0, Math.round(position)))
  return (
    <Box sx={{ maxWidth: members * 7 }}>
      <Box
        role="img"
        aria-label={label}
        sx={{
          display: "flex",
          alignItems: "flex-end",
          gap: members > 60 ? "1px" : "2px",
          height: 22,
        }}
      >
        {Array.from({ length: members }, (_, index) => (
          <Box
            key={index}
            sx={{
              flex: "1 1 0",
              minWidth: "1px",
              height: index === at ? 22 : 14,
              borderRadius: "1px",
              background: index === at ? GD.thisOne : GD.ghost,
            }}
          />
        ))}
      </Box>
      <Box
        aria-hidden
        display="flex"
        justifyContent="space-between"
        marginTop="6px"
        sx={{ fontSize: "10px", color: GD.muted }}
      >
        <span>Weakest</span>
        <span>Strongest</span>
      </Box>
    </Box>
  )
}

/** The rank strip for a comparison chip, when this one is graded. */
export const rankChart = (comparison: Comparison | undefined, noun: string) =>
  comparison?.betterThan === undefined ? undefined : (
    <RankStrip
      position={comparison.betterThan}
      population={comparison.population}
      label={`Better than ${count(comparison.betterThan)} of ${count(
        comparison.population,
      )} graded ${noun}`}
    />
  )

/**
 * The borrower's range of market availability, the age-weighted book figure
 * (dashed, as a computed figure) and this market's position.
 */
export const RangeStrip = ({
  low,
  high,
  book,
  current,
  ids,
}: {
  low: number
  high: number
  book: number
  current: number
  ids: string[]
}) => {
  const floor = Math.max(
    0,
    Math.min(90, Math.floor((Math.min(low, book, current) - 5) / 10) * 10),
  )
  const at = (value: number) =>
    `${
      (100 * (Math.min(100, Math.max(floor, value)) - floor)) / (100 - floor)
    }%`
  return (
    <Box data-metric-ids={ids.join(" ")}>
      <Box
        role="img"
        aria-label="Book range, book figure and this market on a cash-available scale"
        sx={{
          position: "relative",
          height: 8,
          margin: "6px 0",
          borderRadius: "4px",
          background: GD.trackInBox,
        }}
      >
        <Box
          sx={{
            position: "absolute",
            left: at(low),
            width: `calc(${at(high)} - ${at(low)})`,
            minWidth: 2,
            height: "100%",
            borderRadius: "4px",
            background: GD.ghost,
          }}
        />
        <Reference at={at(book)} color={GD.link} dashed />
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            left: `calc(${at(current)} - 6px)`,
            top: -2,
            width: 12,
            height: 12,
            boxSizing: "border-box",
            borderRadius: "50%",
            border: `2px solid ${GD.surface}`,
            background: GD.thisOne,
          }}
        />
      </Box>
      <Box
        aria-hidden
        display="flex"
        justifyContent="space-between"
        sx={{ fontSize: "10px", color: GD.muted }}
      >
        <span>{floor}</span>
        <span>100</span>
      </Box>
      <Box
        aria-hidden
        display="flex"
        flexWrap="wrap"
        gap="6px 16px"
        marginTop="10px"
        sx={{ fontSize: "12px", color: GD.text }}
      >
        <Box display="inline-flex" alignItems="center" gap="6px">
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: GD.thisOne,
            }}
          />
          This market
        </Box>
        <Box display="inline-flex" alignItems="center" gap="6px">
          <Box
            sx={{
              width: 2,
              height: 12,
              background: `repeating-linear-gradient(${GD.link} 0 3px, transparent 3px 5px)`,
            }}
          />
          Book, age-weighted
        </Box>
        <Box display="inline-flex" alignItems="center" gap="6px">
          <Box
            sx={{
              width: 16,
              height: 8,
              borderRadius: "2px",
              background: GD.ghost,
            }}
          />
          Range across markets
        </Box>
      </Box>
    </Box>
  )
}

export type Segment = { value: number; color: string; label: string }

export const ShareBar = ({
  segments,
  ids,
  height = 18,
  compact = false,
  legend = !compact,
}: {
  segments: Segment[]
  ids: string[]
  height?: 14 | 18 | 22
  compact?: boolean
  legend?: boolean
}) => {
  const total = segments.reduce(
    (sum, segment) => sum + positive(segment.value),
    0,
  )
  return (
    <Box data-metric-ids={ids.join(" ")}>
      <Box
        role="img"
        aria-label={segments.map((segment) => segment.label).join("; ")}
        sx={{
          display: "flex",
          height: compact ? 8 : height,
          borderRadius: "5px",
          overflow: "hidden",
          background: GD.track,
        }}
      >
        {segments
          .filter((segment) => positive(segment.value) > 0)
          .map((segment) => (
            <Box
              key={segment.label}
              sx={{
                width: `${(100 * segment.value) / total}%`,
                minWidth: "2px",
                background: segment.color,
              }}
            />
          ))}
      </Box>
      {legend && <Legend items={segments} />}
    </Box>
  )
}

export type CountGroup = {
  count: number
  color: string
  label: string
  /** An unknown member: drawn as an outline, never as a healthy fill. */
  outline?: boolean
}

/**
 * Treatment B: counting beats percentages. Under 700 members each one is a
 * 9 px square; larger records fall back to proportions.
 */
export const CountedSquares = ({
  groups,
  ids,
  legend = true,
}: {
  groups: CountGroup[]
  ids: string[]
  legend?: boolean
}) => {
  const total = groups.reduce((sum, group) => sum + positive(group.count), 0)
  if (total > 700)
    return (
      <ShareBar
        segments={groups.map(({ count: value, ...group }) => ({
          ...group,
          value,
        }))}
        ids={ids}
        legend={legend}
      />
    )
  return (
    <Box data-metric-ids={ids.join(" ")}>
      <Box
        role="img"
        aria-label={groups.map((group) => group.label).join("; ")}
        sx={{ display: "flex", flexWrap: "wrap", gap: "2px" }}
      >
        {groups.flatMap((group) =>
          Array.from(
            { length: Math.floor(positive(group.count)) },
            (_, index) => (
              <Box
                key={`${group.label}-${index}`}
                sx={{
                  width: 9,
                  height: 9,
                  boxSizing: "border-box",
                  borderRadius: "2px",
                  background: group.outline ? "none" : group.color,
                  border: group.outline ? `1px solid ${group.color}` : 0,
                }}
              />
            ),
          ),
        )}
      </Box>
      {legend && <Legend items={groups} />}
    </Box>
  )
}

/** Treatment L: finished incidents by length, as aging buckets. */
export const Buckets = ({
  buckets,
  ids,
  compact,
}: {
  buckets: { label: string; count: number }[]
  ids?: string[]
  compact?: boolean
}) => {
  const max = Math.max(1, ...buckets.map((bucket) => positive(bucket.count)))
  return (
    <Box data-metric-ids={ids?.join(" ")}>
      <Box
        role="img"
        aria-label={buckets
          .map((bucket) => `${bucket.label}: ${bucket.count}`)
          .join("; ")}
        sx={{
          display: "grid",
          gridTemplateColumns: "auto minmax(0, 1fr) auto",
          alignItems: "center",
          gap: compact ? "6px 10px" : "10px 14px",
          fontSize: "12px",
          color: GD.text,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {buckets.map((bucket) => (
          <React.Fragment key={bucket.label}>
            <Box aria-hidden sx={{ color: GD.muted, whiteSpace: "nowrap" }}>
              {bucket.label}
            </Box>
            <Box
              sx={{
                height: compact ? 6 : 10,
                borderRadius: compact ? 3 : 5,
                background: GD.trackInBox,
              }}
            >
              <Box
                sx={{
                  width: share(bucket.count, max),
                  minWidth: bucket.count > 0 ? 2 : 0,
                  height: "100%",
                  borderRadius: compact ? 3 : 5,
                  background: GD.thisOne,
                }}
              />
            </Box>
            <Box aria-hidden sx={{ fontWeight: 600, textAlign: "right" }}>
              {count(positive(bucket.count))}
            </Box>
          </React.Fragment>
        ))}
      </Box>
    </Box>
  )
}

export type LateShareRow = {
  label: string
  lateShare: number
  penaltyShare?: number
  valueLabel: string
  tooltip: string
}

/** Cash shortage and the rolling penalty clock can overlap independently. */
export const LateShareRows = ({
  rows,
  ids,
  compact = false,
}: {
  rows: LateShareRow[]
  ids: string[]
  compact?: boolean
}) => {
  const scale = Math.max(
    10,
    ...rows.flatMap((row) => [
      positive(row.lateShare),
      positive(row.penaltyShare ?? 0),
    ]),
  )
  return (
    <Box data-metric-ids={ids.join(" ")}>
      <Box
        display="flex"
        flexDirection="column"
        gap={compact ? "12px" : "20px"}
      >
        {rows.map((row) => (
          <Tooltip key={row.label} title={row.tooltip} placement="top-start">
            <Box
              tabIndex={0}
              sx={{
                outlineOffset: "5px",
                borderRadius: "4px",
                "&:focus-visible": { outline: `2px solid ${GD.link}` },
              }}
            >
              <Box
                display="flex"
                justifyContent="space-between"
                gap="12px"
                marginBottom={compact ? "6px" : "8px"}
                sx={{
                  fontSize: compact ? "12px" : "13px",
                  color: GD.text,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <Box fontWeight={600} sx={{ overflowWrap: "anywhere" }}>
                  {row.label}
                </Box>
                <Box
                  sx={{
                    textAlign: "right",
                    flexShrink: 0,
                    maxWidth: compact ? "70%" : undefined,
                  }}
                >
                  {row.valueLabel}
                  {compact && (
                    <>
                      {" · "}
                      {row.penaltyShare === undefined
                        ? "Penalty unavailable"
                        : `${row.penaltyShare.toFixed(2)}% penalty`}
                    </>
                  )}
                </Box>
              </Box>
              <Box
                role="img"
                aria-label={`Cash short ${row.lateShare.toFixed(
                  2,
                )}% of life; penalty active ${
                  row.penaltyShare === undefined
                    ? "unavailable"
                    : `${row.penaltyShare.toFixed(2)}% of life`
                }`}
                display="flex"
                flexDirection="column"
                gap={compact ? "3px" : "4px"}
              >
                <Box
                  sx={{
                    height: compact ? 5 : 8,
                    borderRadius: "4px",
                    background: GD.track,
                  }}
                >
                  <Box
                    sx={{
                      width: `${(100 * positive(row.lateShare)) / scale}%`,
                      minWidth: row.lateShare > 0 ? 2 : 0,
                      height: "100%",
                      borderRadius: "4px",
                      background: GD.withinGrace,
                    }}
                  />
                </Box>
                <Box
                  sx={{
                    height: compact ? 5 : 8,
                    borderRadius: "4px",
                    background: GD.track,
                  }}
                >
                  <Box
                    sx={{
                      width: `${
                        (100 * positive(row.penaltyShare ?? 0)) / scale
                      }%`,
                      minWidth: (row.penaltyShare ?? 0) > 0 ? 2 : 0,
                      height: "100%",
                      borderRadius: "4px",
                      background: GD.pastAllowance,
                    }}
                  />
                </Box>
              </Box>
              {!compact && (
                <Box
                  sx={{ fontSize: "12px", marginTop: "6px", color: GD.text }}
                >
                  Penalty active{" "}
                  {row.penaltyShare === undefined
                    ? "unavailable"
                    : `${row.penaltyShare.toFixed(2)}%`}
                </Box>
              )}
            </Box>
          </Tooltip>
        ))}
      </Box>
      <Legend
        items={[
          { color: GD.withinGrace, label: "Cash short" },
          { color: GD.pastAllowance, label: "Penalty active" },
        ]}
      />
    </Box>
  )
}

/** Two overlapping observation windows are a comparison, not a time series. */
export const DirectionLine = ({
  from,
  to,
  fromLabel,
  toLabel,
  ids,
  compact = false,
}: {
  from: number
  to: number
  fromLabel: string
  toLabel: string
  ids: string[]
  compact?: boolean
}) => (
  <Box
    data-metric-ids={ids.join(" ")}
    display="flex"
    flexDirection="column"
    gap={compact ? "12px" : "20px"}
  >
    {[
      { value: from, label: fromLabel },
      { value: to, label: toLabel },
    ].map((item) => (
      <Box key={item.label}>
        <Box
          sx={{
            fontSize: compact ? "12px" : "13px",
            color: GD.text,
            marginBottom: compact ? "6px" : "10px",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {item.label}
        </Box>
        <Box
          role="img"
          aria-label={item.label}
          sx={{
            height: compact ? 8 : 12,
            borderRadius: "5px",
            background: GD.track,
          }}
        >
          <Box
            sx={{
              width: `${Math.min(100, positive(item.value))}%`,
              height: "100%",
              borderRadius: "5px",
              background: GD.link,
            }}
          />
        </Box>
      </Box>
    ))}
  </Box>
)
