import { Box, Chip } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import humanizeDuration from "humanize-duration"

import Clock from "@/assets/icons/clock_icon.svg"
import { COLORS } from "@/theme/colors"
import { remainingMillisecondsToDate } from "@/utils/formatters"

import { HealthyStatusChipProps } from "./interface"

const ClockIcon = () => (
  <SvgIcon fontSize="tiny" sx={{ "& path": { fill: COLORS.galliano } }}>
    <Clock />
  </SvgIcon>
)

export const HealthyStatusChip = ({ msLeft }: HealthyStatusChipProps) => {
  const daysLeft = Number(
    humanizeDuration(msLeft, {
      round: false,
      units: ["d"],
    }).replace(/[^\d.]/g, ""),
  )

  let additionalChipConfig

  if (daysLeft > 7) {
    additionalChipConfig = {
      label: `Till ${remainingMillisecondsToDate(msLeft)}`,
      backgroundColor: COLORS.whiteSmoke,
      color: COLORS.santasGrey,
    }
  } else {
    additionalChipConfig = {
      label: `${humanizeDuration(msLeft, {
        round: true,
        largest: 1,
      })} left`,
      icon: <ClockIcon />,
      backgroundColor: COLORS.oasis,
      color: COLORS.butteredRum,
    }
  }

  return (
    <Box sx={{ display: "flex", gap: "2px", flexWrap: "wrap" }}>
      <Chip
        label="Healthy"
        sx={{
          backgroundColor: COLORS.glitter,
          color: COLORS.ultramarineBlue,
        }}
      />

      <Chip
        label={additionalChipConfig.label}
        icon={additionalChipConfig.icon}
        sx={{
          backgroundColor: additionalChipConfig.backgroundColor,
          color: additionalChipConfig.color,
          columnGap: "4px",
        }}
      />
    </Box>
  )
}
