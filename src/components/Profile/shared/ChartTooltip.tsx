"use client"

import { Box, Typography } from "@mui/material"

import { COLORS } from "@/theme/colors"

type ChartTooltipPayload = {
  name: string
  value: number | string
  color: string
  payload?: { date?: string; subHeader?: string }
}

type ChartTooltipProps = {
  active?: boolean
  payload?: ChartTooltipPayload[]
  label?: string | number
  headerKey?: "date" | "label"
  formatValue: (value: number) => string
  filterZero?: boolean
}

export const ChartTooltip = ({
  active,
  payload,
  label,
  headerKey = "date",
  formatValue,
  filterZero = true,
}: ChartTooltipProps) => {
  if (!active || !payload?.length) return null

  const header =
    headerKey === "label"
      ? String(label ?? "")
      : payload[0]?.payload?.date ?? ""

  const subHeader =
    headerKey === "label" ? payload[0]?.payload?.subHeader ?? "" : ""

  const visible = payload.filter((entry) => {
    if (entry.name.startsWith("__")) return false
    if (!filterZero) return true
    const numericValue = Number(entry.value)
    return Number.isFinite(numericValue) && numericValue !== 0
  })

  if (visible.length === 0) return null

  return (
    <Box
      sx={{
        backgroundColor: COLORS.blackRock,
        border: `1px solid ${COLORS.iron}`,
        borderRadius: "6px",
        padding: "8px 12px",
        fontFamily: "monospace",
        fontSize: "11px",
      }}
    >
      {header && (
        <Typography
          sx={{
            color: COLORS.santasGrey,
            marginBottom: subHeader ? "2px" : "4px",
            fontSize: "11px",
            fontFamily: "monospace",
          }}
        >
          {header}
        </Typography>
      )}
      {subHeader && (
        <Typography
          sx={{
            color: COLORS.iron,
            marginBottom: "4px",
            fontSize: "10px",
            fontFamily: "monospace",
          }}
        >
          {subHeader}
        </Typography>
      )}
      {visible.map((entry) => (
        <Box
          key={entry.name}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "2px",
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "2px",
              backgroundColor: entry.color,
            }}
          />
          <Typography
            component="span"
            sx={{ color: COLORS.santasGrey, fontSize: "11px" }}
          >
            {entry.name}:
          </Typography>
          <Typography
            component="span"
            sx={{ color: COLORS.white, fontWeight: 600, fontSize: "11px" }}
          >
            {formatValue(Number(entry.value))}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}
