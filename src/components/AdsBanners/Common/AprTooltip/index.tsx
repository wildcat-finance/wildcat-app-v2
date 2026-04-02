import * as React from "react"
import { ReactNode } from "react"

import { Box, Divider, Paper, SvgIcon, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import Withdrawal from "@/assets/icons/withdrawal-coins_icon.svg"
import { COLORS } from "@/theme/colors"

export const AprTooltip = ({
  baseAPR,
  aprProposal,
  banner,
  withdrawalAnyTime,
}: {
  baseAPR: string
  aprProposal: ReactNode
  banner: ReactNode
  withdrawalAnyTime?: boolean
}) => {
  const { t } = useTranslation()

  return (
    <Paper
      sx={{
        boxSizing: "border-box",
        padding: "12px",
        borderRadius: "8px",
        borderColor: COLORS.athensGrey,

        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <Box
        sx={{
          maxWidth: "294px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="text3" fontWeight={600}>
            {t("adsBanners.baseApr")}
          </Typography>

          <Typography variant="text3" fontWeight={600}>
            {baseAPR.includes("%") ? baseAPR : `${baseAPR}%`}
          </Typography>
        </Box>

        <Typography variant="text3" color={COLORS.blackRock}>
          {t("adsBanners.baseAprDescription")}
        </Typography>
      </Box>

      {withdrawalAnyTime && (
        <Box
          sx={{
            maxWidth: "294px",
            padding: "8px",
            borderRadius: "8px",
            backgroundColor: COLORS.glitter,
            display: "flex",
            alignItems: "flex-start",
            gap: "6px",
          }}
        >
          <SvgIcon
            sx={{ opacity: 0.5, "& path": { fill: COLORS.ultramarineBlue } }}
          >
            <Withdrawal />
          </SvgIcon>

          <Box sx={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <Typography variant="text3" color={COLORS.ultramarineBlue}>
              {t("adsBanners.requestWithdrawalAnytime")}
            </Typography>

            <Typography variant="text4" color={COLORS.ultramarineBlue}>
              {t("adsBanners.withdrawalCycleNote")}
            </Typography>
          </Box>
        </Box>
      )}

      <Divider sx={{ borderColor: COLORS.athensGrey }} />

      <Box
        sx={{
          maxWidth: "294px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {aprProposal}

        <Typography variant="text3" color={COLORS.blackRock}>
          {t("adsBanners.rewardsAprDescription")}
        </Typography>
      </Box>

      {banner}

      <Typography
        variant="text4"
        color={COLORS.santasGrey}
        sx={{ maxWidth: "294px", px: "5px" }}
      >
        {t("adsBanners.rewardsDisclaimer")}
      </Typography>
    </Paper>
  )
}
