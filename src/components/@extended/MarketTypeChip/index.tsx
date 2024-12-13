import { Box, Chip } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import { HooksKind } from "@wildcatfi/wildcat-sdk"
import humanizeDuration from "humanize-duration"

import Clock from "@/assets/icons/clock_icon.svg"
import { COLORS } from "@/theme/colors"
import { remainingMillisecondsToDate } from "@/utils/formatters"

import { MarketTypeChipProps } from "./interface"

const ClockIcon = () => (
  <SvgIcon fontSize="tiny" sx={{ "& path": { fill: COLORS.santasGrey } }}>
    <Clock />
  </SvgIcon>
)

export const MarketTypeChip = ({ kind, fixedPeriod }: MarketTypeChipProps) => {
  const daysLeft = Number(
    humanizeDuration(Math.abs(fixedPeriod || 0), {
      round: false,
      units: ["d"],
    }).replace(/[^\d.]/g, ""),
  )

  let additionalChipConfig

  if (daysLeft > 7) {
    additionalChipConfig = {
      label: `Maturity ${remainingMillisecondsToDate(fixedPeriod || 0)}`,
      backgroundColor: COLORS.whiteSmoke,
      color: COLORS.santasGrey,
    }
  } else {
    const suffix = fixedPeriod && fixedPeriod > 0 ? "left" : "ago"
    additionalChipConfig = {
      label: `${humanizeDuration(fixedPeriod || 0, {
        round: true,
        largest: 1,
      })} ${suffix}`,
      icon: <ClockIcon />,
      backgroundColor: COLORS.oasis,
      color: COLORS.butteredRum,
    }
  }

  return (
    <Box sx={{ display: "flex", gap: "4px 2px", flexWrap: "wrap" }}>
      <Chip
        icon={<ClockIcon />}
        label={kind === HooksKind.OpenTerm ? "Open Term" : "Fixed Term"}
        sx={{
          backgroundColor: COLORS.blackHaze,
          color:
            kind === HooksKind.OpenTerm ? COLORS.santasGrey : COLORS.blackRock,
        }}
      />

      {fixedPeriod && (
        <Chip
          label={additionalChipConfig.label}
          // icon={additionalChipConfig.icon}
          sx={{
            backgroundColor: COLORS.blackHaze,
            color: COLORS.blackRock,
            // columnGap: "4px",
          }}
        />
      )}
    </Box>
  )
}
