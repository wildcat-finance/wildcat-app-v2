import { Box, Chip } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import humanizeDuration from "humanize-duration"
import { useTranslation } from "react-i18next"

import Clock from "@/assets/icons/clock_icon.svg"
import { COLORS } from "@/theme/colors"
import { remainingMillisecondsToDate } from "@/utils/formatters"

import { HealthyStatusChipProps } from "./interface"

const ClockIcon = () => (
  <SvgIcon fontSize="tiny" sx={{ "& path": { fill: COLORS.galliano } }}>
    <Clock />
  </SvgIcon>
)

export const HealthyStatusChip = ({
  msLeft,
  withPeriod = true,
}: HealthyStatusChipProps) => {
  const { t } = useTranslation()
  const daysLeft = Number(
    humanizeDuration(msLeft || 0, {
      round: false,
      units: ["d"],
    }).replace(/[^\d.]/g, ""),
  )

  let additionalChipConfig

  if (daysLeft > 7) {
    additionalChipConfig = {
      label: t("marketStatus.healthy.till", {
        date: remainingMillisecondsToDate(msLeft || 0),
      }),
      backgroundColor: COLORS.whiteSmoke,
      color: COLORS.santasGrey,
    }
  } else {
    additionalChipConfig = {
      label: t("marketStatus.healthy.timeLeft", {
        time: humanizeDuration(msLeft || 0, {
          round: true,
          largest: 1,
        }),
      }),
      icon: <ClockIcon />,
      backgroundColor: COLORS.oasis,
      color: COLORS.butteredRum,
    }
  }

  console.log(
    t("marketStatus.healthy.till", {
      date: remainingMillisecondsToDate(msLeft || 0),
    }),
  )

  return (
    <Box sx={{ display: "flex", gap: "4px 2px", flexWrap: "wrap" }}>
      <Chip
        label={t("marketStatus.healthy.label")}
        sx={{
          backgroundColor: COLORS.glitter,
          color: COLORS.ultramarineBlue,
        }}
      />

      {msLeft && msLeft > 0 && withPeriod && (
        <Chip
          label={additionalChipConfig.label}
          icon={additionalChipConfig.icon}
          sx={{
            backgroundColor: additionalChipConfig.backgroundColor,
            color: additionalChipConfig.color,
            columnGap: "4px",
          }}
        />
      )}
    </Box>
  )
}
