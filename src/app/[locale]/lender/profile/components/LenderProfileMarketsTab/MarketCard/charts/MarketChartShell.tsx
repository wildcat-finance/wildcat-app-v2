"use client"

import * as React from "react"

import { Box, Typography } from "@mui/material"

import { COLORS } from "@/theme/colors"

import {
  CHART_PANEL_BG,
  CHART_PLOT_HEIGHT,
  CHART_RANGES,
  ChartRange,
  LegendItem,
} from "./constants"

export const ChartRangeSelector = ({
  value,
  onChange,
}: {
  value: ChartRange
  onChange: (range: ChartRange) => void
}) => (
  <Box
    sx={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}
  >
    {CHART_RANGES.map((range) => {
      const isActive = range === value

      return (
        <Box
          key={range}
          component="button"
          type="button"
          onClick={() => onChange(range)}
          sx={{
            // Constant footprint across states (same padding + always a 1px
            // border) so switching the active range never reflows the row. The
            // label is overlaid on an invisible semibold "ghost" so the 500↔600
            // weight change doesn't shift width either.
            cursor: "pointer",
            display: "inline-grid",
            placeItems: "center",
            boxSizing: "border-box",
            backgroundColor: "transparent",
            color: COLORS.blackRock,
            padding: "4px 12px",
            borderRadius: "10px",
            border: `1px solid ${isActive ? COLORS.santasGrey : "transparent"}`,
          }}
        >
          <Box
            component="span"
            sx={{
              gridArea: "1 / 1",
              typography: "text3",
              fontWeight: isActive ? 600 : 500,
            }}
          >
            {range}
          </Box>
          <Box
            aria-hidden
            component="span"
            sx={{
              gridArea: "1 / 1",
              typography: "text3",
              fontWeight: 600,
              visibility: "hidden",
            }}
          >
            {range}
          </Box>
        </Box>
      )
    })}
  </Box>
)

const LegendSwatch = ({ item }: { item: LegendItem }) => {
  if (item.variant === "line") {
    return (
      <Box
        sx={{
          width: "12px",
          height: "2px",
          borderRadius: "1px",
          backgroundColor: item.color,
          flexShrink: 0,
        }}
      />
    )
  }

  if (item.variant === "dashed") {
    return (
      <Box
        sx={{
          width: "12px",
          height: 0,
          borderTop: `1.5px dashed ${item.color}`,
          flexShrink: 0,
        }}
      />
    )
  }

  return (
    <Box
      sx={{
        width: "8px",
        height: "8px",
        borderRadius: "2px",
        flexShrink: 0,
        backgroundColor:
          item.variant === "square"
            ? item.color
            : item.fillColor ?? "transparent",
        border: item.variant === "outline" ? `1px solid ${item.color}` : "none",
      }}
    />
  )
}

export const ChartLegend = ({ items }: { items: LegendItem[] }) => (
  <Box
    sx={{
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      gap: "8px 16px",
    }}
  >
    {items.map((item) => (
      <Box
        key={item.label}
        sx={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}
      >
        <LegendSwatch item={item} />
        <Typography variant="text4" color={COLORS.blackRock} noWrap>
          {item.label}
        </Typography>
      </Box>
    ))}
  </Box>
)

const AxisCaption = ({ label }: { label: string }) => (
  <Typography variant="caption" color={COLORS.matteSilver} noWrap>
    {label}
  </Typography>
)

export const MarketChartShell = ({
  title,
  subtitle,
  range,
  onRangeChange,
  leftAxisLabel,
  rightAxisLabel,
  legend,
  children,
}: {
  title: string
  subtitle: string
  range: ChartRange
  onRangeChange: (range: ChartRange) => void
  leftAxisLabel?: string
  rightAxisLabel?: string
  legend: LegendItem[]
  children: React.ReactNode
}) => (
  <Box
    sx={{
      backgroundColor: CHART_PANEL_BG,
      borderRadius: "12px",
      padding: "16px",
      display: "flex",
      flexDirection: "column",
    }}
  >
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "12px",
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="text3" color={COLORS.blackRock} display="block">
          {title}
        </Typography>
        <Typography variant="text3" color={COLORS.matteSilver} display="block">
          {subtitle}
        </Typography>
      </Box>

      <ChartRangeSelector value={range} onChange={onRangeChange} />
    </Box>

    {(leftAxisLabel || rightAxisLabel) && (
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          gap: "8px",
          marginTop: "16px",
        }}
      >
        {leftAxisLabel ? <AxisCaption label={leftAxisLabel} /> : <span />}
        {rightAxisLabel ? <AxisCaption label={rightAxisLabel} /> : <span />}
      </Box>
    )}

    <Box sx={{ height: CHART_PLOT_HEIGHT, marginTop: "4px" }}>{children}</Box>

    <Box sx={{ marginTop: "12px" }}>
      <ChartLegend items={legend} />
    </Box>
  </Box>
)
