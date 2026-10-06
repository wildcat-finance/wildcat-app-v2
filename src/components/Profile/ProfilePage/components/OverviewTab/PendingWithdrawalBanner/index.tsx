"use client"

import { Box, Button, SvgIcon, Typography } from "@mui/material"

import ClockIcon from "@/assets/icons/clock_icon.svg"
import { formatUsd } from "@/components/Profile/shared/analytics"
import { COLORS } from "@/theme/colors"

const BANNER_BG = "#FBEDC380"
const ACCENT = COLORS.butteredRum

export const PendingWithdrawalBanner = ({
  count,
  queuedValue,
  nextExpiry,
  onViewQueue,
}: {
  count: number
  queuedValue: number
  nextExpiry: string
  onViewQueue: () => void
}) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "16px",
      flexWrap: "wrap",
      backgroundColor: BANNER_BG,
      border: `1px solid #FBEDC3`,
      borderRadius: "12px",
      padding: "12px",
    }}
  >
    <Box
      sx={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}
    >
      <SvgIcon
        component={ClockIcon}
        sx={{ fontSize: "16px", "& path": { fill: ACCENT } }}
      />

      <Box sx={{ minWidth: 0 }}>
        <Typography variant="text3" color="#775D13" display="block">
          {count} pending withdrawal{count === 1 ? "" : "s"}
        </Typography>
        <Typography
          variant="text3"
          color="#775D13"
          sx={{ opacity: 0.8 }}
          display="block"
        >
          Queued value {formatUsd(queuedValue, { compact: true })} · next expiry{" "}
          {nextExpiry}
        </Typography>
      </Box>
    </Box>

    <Button
      type="button"
      variant="outlined"
      size="small"
      onClick={onViewQueue}
      sx={{
        flexShrink: 0,
        color: "#775D13",
        borderColor: `#D6A820`,
        backgroundColor: "transparent",
        "&:hover": {
          borderColor: ACCENT,
          backgroundColor: "transparent",
        },
      }}
    >
      View queue
    </Button>
  </Box>
)
