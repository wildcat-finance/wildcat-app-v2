import * as React from "react"

import { Box, SvgIcon, Typography } from "@mui/material"

import { LegStatus } from "@/app/[locale]/lender/market/[address]/hooks/useWithdrawFlow"
import Check from "@/assets/icons/check_icon.svg"
import { COLORS } from "@/theme/colors"

export type StepRow = {
  n: number
  title: string
  detail: string
  status: LegStatus
  statusLabel: string
}

const markerStyle = (status: LegStatus) => {
  switch (status) {
    case LegStatus.Done:
      return { backgroundColor: COLORS.caribbeanGreen, color: COLORS.white }
    case LegStatus.Failed:
      return { backgroundColor: COLORS.carminePink, color: COLORS.white }
    case LegStatus.Waiting:
      return { backgroundColor: COLORS.athensGrey, color: COLORS.santasGrey }
    default:
      return { backgroundColor: COLORS.blackRock, color: COLORS.white }
  }
}

const markerContent = (status: LegStatus, n: number) => {
  if (status === LegStatus.Done) {
    return (
      <SvgIcon sx={{ fontSize: "12px", "& path": { fill: COLORS.white } }}>
        <Check />
      </SvgIcon>
    )
  }
  if (status === LegStatus.Failed) return "!"
  return String(n)
}

/**
 * Explicit multi-transaction progress. An EOA withdrawal that has to unwrap
 * first costs two signatures; this makes the count, the order and the current
 * position visible instead of hiding both behind one spinner.
 */
export const WithdrawSteps = ({
  headerLabel,
  amountLabel,
  rows,
}: {
  headerLabel: string
  amountLabel: string
  rows: StepRow[]
}) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: "20px" }}>
    <Box
      sx={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: "12px",
      }}
    >
      <Typography variant="text3" color={COLORS.santasGrey}>
        {headerLabel}
      </Typography>
      <Typography variant="text3" fontWeight={600} color={COLORS.blackRock}>
        {amountLabel}
      </Typography>
    </Box>

    <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {rows.map((row) => (
        <Box
          key={row.n}
          sx={{
            display: "flex",
            gap: "14px",
            padding: "16px",
            border: `1px solid ${COLORS.whiteLilac}`,
            borderRadius: "12px",
          }}
        >
          <Box
            sx={{
              width: "24px",
              height: "24px",
              flex: "0 0 24px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              fontWeight: 700,
              ...markerStyle(row.status),
            }}
          >
            {markerContent(row.status, row.n)}
          </Box>

          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <Typography
                variant="text3"
                fontWeight={600}
                color={COLORS.blackRock}
              >
                {row.title}
              </Typography>
              <Typography
                variant="text4"
                color={
                  row.status === LegStatus.Failed
                    ? COLORS.carminePink
                    : COLORS.santasGrey
                }
                whiteSpace="nowrap"
              >
                {row.statusLabel}
              </Typography>
            </Box>
            <Typography variant="text3" color={COLORS.santasGrey}>
              {row.detail}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  </Box>
)
