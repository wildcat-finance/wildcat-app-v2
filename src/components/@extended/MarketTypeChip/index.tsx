import { Box, Chip, Typography } from "@mui/material"
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

const MARKET_TYPE_LABELS: Record<HooksKind, string> = {
  [HooksKind.OpenTerm]: "Open Term",
  [HooksKind.FixedTerm]: "Fixed Term",
  [HooksKind.PeriodicTerm]: "Periodic Term",
  [HooksKind.Unknown]: "Unknown Term",
}

export const MarketTypeChip = ({
  type,
  kind,
  fixedPeriod,
  isMobile,
}: MarketTypeChipProps) => {
  const daysLeft = Number(
    humanizeDuration(Math.abs(fixedPeriod || 0), {
      round: false,
      units: ["d"],
    }).replace(/[^\d.]/g, ""),
  )

  const suffix = fixedPeriod && fixedPeriod > 0 ? "left" : "ago"
  const chipTimeLabel =
    daysLeft > 7
      ? remainingMillisecondsToDate(fixedPeriod || 0)
      : `${humanizeDuration(fixedPeriod || 0, {
          round: true,
          largest: 1,
        })} ${suffix}`

  const isFixedTerm = kind === HooksKind.FixedTerm
  let additionalChipConfig

  if (daysLeft > 7) {
    additionalChipConfig = {
      label: `Maturity ${chipTimeLabel}`,
      backgroundColor: COLORS.whiteSmoke,
      color: COLORS.santasGrey,
    }
  } else {
    additionalChipConfig = {
      label: chipTimeLabel,
      icon: <ClockIcon />,
      backgroundColor: COLORS.oasis,
      color: COLORS.butteredRum,
    }
  }

  if (type === "table")
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
        {isFixedTerm && (
          <SvgIcon
            sx={{
              fontSize: "11px",
              mt: "-1px",
              "& path": { fill: COLORS.santasGrey },
            }}
          >
            <ClockIcon />
          </SvgIcon>
        )}

        <Typography variant={isMobile ? "mobText4" : "text3"}>
          {isFixedTerm ? chipTimeLabel : MARKET_TYPE_LABELS[kind]}
        </Typography>
      </Box>
    )

  return (
    <Box sx={{ display: "flex", gap: "4px 2px", flexWrap: "wrap" }}>
      <Chip
        icon={<ClockIcon />}
        label={MARKET_TYPE_LABELS[kind]}
        sx={{
          backgroundColor: COLORS.blackHaze,
          color:
            kind === HooksKind.OpenTerm ? COLORS.santasGrey : COLORS.blackRock,
        }}
      />

      {isFixedTerm && fixedPeriod !== undefined && (
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
