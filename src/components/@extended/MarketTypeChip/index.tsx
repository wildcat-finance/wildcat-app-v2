import { Box, Chip, Typography } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import { HooksKind } from "@wildcatfi/wildcat-sdk"
import humanizeDuration from "humanize-duration"
import { useTranslation } from "react-i18next"

import Clock from "@/assets/icons/clock_icon.svg"
import { MARKET_TYPE_CHIP_KEY } from "@/constants/i18nKeys"
import { useLiveNowSeconds } from "@/hooks/useLiveNowSeconds"
import { COLORS } from "@/theme/colors"
import {
  formatUtcMaturityDate,
  remainingMillisecondsToDate,
} from "@/utils/formatters"
import {
  formatCompactDuration,
  getPeriodicScheduleTiming,
} from "@/utils/periodicWithdrawalWindow"

import { MarketTypeChipProps } from "./interface"

const ClockIcon = () => (
  <SvgIcon fontSize="tiny" sx={{ "& path": { fill: COLORS.santasGrey } }}>
    <Clock />
  </SvgIcon>
)

export const MarketTypeChip = ({
  type,
  kind,
  fixedPeriod,
  fixedTermEndTime,
  periodicWindow,
  isMobile,
}: MarketTypeChipProps) => {
  const { t } = useTranslation()

  const daysLeft = Number(
    humanizeDuration(Math.abs(fixedPeriod || 0), {
      round: false,
      units: ["d"],
    }).replace(/[^\d.]/g, ""),
  )

  const suffix = fixedPeriod && fixedPeriod > 0 ? "left" : "ago"
  const maturityDateLabel =
    fixedTermEndTime !== undefined
      ? formatUtcMaturityDate(fixedTermEndTime)
      : remainingMillisecondsToDate(fixedPeriod || 0)
  const chipTimeLabel =
    daysLeft > 7
      ? maturityDateLabel
      : `${humanizeDuration(fixedPeriod || 0, {
          round: true,
          largest: 1,
        })} ${suffix}`

  const isFixedTerm = kind === HooksKind.FixedTerm
  const isPeriodicTerm = kind === HooksKind.PeriodicTerm

  const hasLivePeriodicWindow =
    isPeriodicTerm && !!periodicWindow && !periodicWindow.isTermClosed
  const nowSec = useLiveNowSeconds(hasLivePeriodicWindow)

  let periodicChipConfig:
    | { label: string; backgroundColor: string; color: string }
    | undefined
  if (hasLivePeriodicWindow && periodicWindow) {
    const timing = getPeriodicScheduleTiming(periodicWindow, nowSec)
    periodicChipConfig = timing.isOpen
      ? {
          label: t("marketTypeChip.windowOpen"),
          backgroundColor: COLORS.oasis,
          color: COLORS.butteredRum,
        }
      : {
          // Compact ("5m") — verbose units overflow the table type column.
          label: t("marketTypeChip.windowOpensIn", {
            duration: formatCompactDuration(timing.nextWindowStart - nowSec, 1),
          }),
          backgroundColor: COLORS.whiteSmoke,
          color: COLORS.santasGrey,
        }
  }

  const tableLabel = isFixedTerm
    ? chipTimeLabel
    : periodicChipConfig?.label ?? t(MARKET_TYPE_CHIP_KEY[kind])

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
          {tableLabel}
        </Typography>
      </Box>
    )

  return (
    <Box sx={{ display: "flex", gap: "4px 2px", flexWrap: "wrap" }}>
      <Chip
        icon={<ClockIcon />}
        label={t(MARKET_TYPE_CHIP_KEY[kind])}
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

      {isPeriodicTerm && periodicChipConfig && (
        <Chip
          label={periodicChipConfig.label}
          sx={{
            backgroundColor: periodicChipConfig.backgroundColor,
            color: periodicChipConfig.color,
          }}
        />
      )}
    </Box>
  )
}
