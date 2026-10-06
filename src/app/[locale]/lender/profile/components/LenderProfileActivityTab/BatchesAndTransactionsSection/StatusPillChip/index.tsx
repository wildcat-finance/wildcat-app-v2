import { FC, SVGProps } from "react"

import { Box, SvgIcon, Typography } from "@mui/material"

import CompletedIcon from "@/assets/icons/chipBlueCheck_icon.svg"
import PendingIcon from "@/assets/icons/chipEmptyGrey_icon.svg"
import ClosedIcon from "@/assets/icons/chipGreyCross_icon.svg"
import ExpiredIcon from "@/assets/icons/chipYellowAlert_icon.svg"
import { COLORS } from "@/theme/colors"

export type BatchStatus = "Completed" | "Pending" | "Expired" | "Closed"

export const BATCH_STATUS_PALETTE: Record<
  BatchStatus,
  { bg: string; color: string; opacity: number; icon: FC<SVGProps<SVGElement>> }
> = {
  Completed: {
    bg: COLORS.blueRibbon01,
    color: COLORS.ultramarineBlue,
    opacity: 1,
    icon: CompletedIcon,
  },
  Pending: {
    bg: COLORS.blackHaze,
    color: COLORS.blackRock,
    opacity: 0.8,
    icon: PendingIcon,
  },
  Expired: {
    bg: COLORS.oasis,
    color: COLORS.butteredRum,
    opacity: 1,
    icon: ExpiredIcon,
  },
  Closed: {
    bg: COLORS.athensGrey,
    color: COLORS.manate,
    opacity: 1,
    icon: ClosedIcon,
  },
}

export const StatusPillChip = ({ status }: { status: BatchStatus }) => {
  const palette = BATCH_STATUS_PALETTE[status]

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        borderRadius: "12px",
        padding: "2px 6px 2px 4px",
        backgroundColor: palette.bg,
      }}
    >
      <SvgIcon component={palette.icon} sx={{ fontSize: "16px" }} />

      <Typography
        variant="text4"
        sx={{ color: palette.color, opacity: palette.opacity }}
      >
        {status}
      </Typography>
    </Box>
  )
}
