import { Box, Chip, Typography } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import { useTranslation } from "react-i18next"

import DefaultedIcon from "@/assets/icons/defaulted_icon.svg"
import { COLORS } from "@/theme/colors"
import { lh, pxToRem } from "@/theme/units"

import { DefaultedStatusChipProps } from "./interface"

export const DefaultedStatusChip = ({
  penaltyDays,
  variant = "filled",
  withPeriod = true,
  periodLayout = "stacked",
}: DefaultedStatusChipProps) => {
  const { t } = useTranslation()

  const label = t("defaultedMarkets.chip.label")
  const days = Math.floor(penaltyDays)

  const chip =
    variant === "text" ? (
      <Chip variant="outlined" label={label} sx={{ color: COLORS.blackRock }} />
    ) : (
      <Chip
        label={label}
        icon={
          <SvgIcon fontSize="small" sx={{ "& path": { fill: COLORS.white } }}>
            <DefaultedIcon />
          </SvgIcon>
        }
        sx={{
          backgroundColor: COLORS.blackRock,
          color: COLORS.white,
          borderRadius: "8px",
          padding: "0 6px 0 2px",
        }}
      />
    )

  if (!withPeriod || days < 1) return chip

  const isInline = periodLayout === "inline"

  return (
    <Box
      sx={
        isInline
          ? { display: "flex", alignItems: "center", columnGap: "10px" }
          : {
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              rowGap: "6px",
            }
      }
    >
      {chip}
      <Typography
        variant={isInline ? "text4" : undefined}
        sx={{
          color: COLORS.blackRock08,
          whiteSpace: "nowrap",
          // The table caption is a 9px style with no typography variant
          ...(!isInline && {
            fontSize: pxToRem(9),
            lineHeight: lh(12, 9),
            fontWeight: 500,
          }),
        }}
      >
        {t("defaultedMarkets.chip.penaltyDays", { days })}
      </Typography>
    </Box>
  )
}
