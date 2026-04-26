"use client"

import * as React from "react"

import { ToggleButton, ToggleButtonGroup } from "@mui/material"

import { COLORS } from "@/theme/colors"

export type ChartPeriod = "D" | "W" | "M" | "Q" | "Y" | "Cumulative"

export const CHART_PERIODS: ChartPeriod[] = [
  "D",
  "W",
  "M",
  "Q",
  "Y",
  "Cumulative",
]

export const ChartPeriodSelector = ({
  value,
  onChange,
}: {
  value: ChartPeriod
  onChange: (value: ChartPeriod) => void
}) => (
  <ToggleButtonGroup
    exclusive
    size="small"
    value={value}
    onChange={(_, nextValue: ChartPeriod | null) => {
      if (nextValue) onChange(nextValue)
    }}
    sx={{
      maxWidth: "100%",
      overflowX: "auto",
      scrollbarWidth: "none",
      "&::-webkit-scrollbar": {
        display: "none",
      },
      "& .MuiToggleButton-root": {
        borderColor: COLORS.athensGrey,
        color: COLORS.santasGrey,
        flexShrink: 0,
        fontFamily: "inherit",
        fontSize: 10,
        lineHeight: 1,
        minWidth: 30,
        padding: "5px 7px",
        textTransform: "none",
      },
      "& .MuiToggleButton-root:focus-visible": {
        outline: `2px solid ${COLORS.ultramarineBlue}`,
        outlineOffset: "2px",
      },
      "& .Mui-selected": {
        backgroundColor: `${COLORS.ultramarineBlue}14 !important`,
        color: `${COLORS.ultramarineBlue} !important`,
      },
    }}
  >
    {CHART_PERIODS.map((period) => (
      <ToggleButton
        key={period}
        value={period}
        aria-label={`${period} grouping`}
      >
        {period}
      </ToggleButton>
    ))}
  </ToggleButtonGroup>
)

const getUtcDate = (timestamp: number) => new Date(timestamp * 1000)

export const getPeriodStartTimestamp = (
  timestamp: number,
  period: Exclude<ChartPeriod, "D" | "Cumulative">,
) => {
  const date = getUtcDate(timestamp)
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()

  if (period === "W") {
    const start = new Date(
      Date.UTC(year, month, date.getUTCDate() - ((date.getUTCDay() + 6) % 7)),
    )
    return Math.floor(start.getTime() / 1000)
  }

  if (period === "M") return Math.floor(Date.UTC(year, month, 1) / 1000)
  if (period === "Q")
    return Math.floor(Date.UTC(year, month - (month % 3), 1) / 1000)
  return Math.floor(Date.UTC(year, 0, 1) / 1000)
}

export const groupPeriodData = <
  TInput extends { timestamp: number },
  TOutput extends { timestamp: number },
>(
  data: TInput[],
  period: ChartPeriod,
  create: (point: TInput, timestamp: number) => TOutput,
  merge: (target: TOutput, point: TInput) => void,
): TOutput[] => {
  if (period === "D" || period === "Cumulative") {
    return data.map((point) => create(point, point.timestamp))
  }

  const grouped = new Map<number, TOutput>()

  data.forEach((point) => {
    const timestamp = getPeriodStartTimestamp(point.timestamp, period)
    const existing = grouped.get(timestamp)

    if (!existing) {
      grouped.set(timestamp, create(point, timestamp))
      return
    }

    merge(existing, point)
  })

  return Array.from(grouped.values()).sort(
    (left, right) => left.timestamp - right.timestamp,
  )
}
