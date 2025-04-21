"use client"

import { useState } from "react"

import { Box, Button, Typography, useMediaQuery, useTheme } from "@mui/material"
import { useTranslation } from "react-i18next"

import { DelegationForm } from "@/app/[locale]/airdrop/[allocation]/components/DelegationForm"
import { COLORS } from "@/theme/colors"

import {
  mainBox,
  leftBox,
  rightBox,
  footerText,
  containerBox,
  leftTitle,
} from "./style"
import { AllocationBox } from "../AllocationBox"
import { ProgressHeader } from "../components/ProgressHeader"
import { Parameters } from "../Parameters"

export default function DelegationPage() {
  const { t } = useTranslation()
  const theme = useTheme()
  const breakpoint = theme.breakpoints
  const isMobile = useMediaQuery(breakpoint.down("sm"))

  const [progress, setProgress] = useState(20)

  return (
    <Box sx={containerBox(theme)}>
      <Box sx={mainBox(theme)}>
        <Box sx={rightBox(theme)}>
          <>
            <ProgressHeader progress={progress} setProgress={setProgress} />
            <DelegationForm />
          </>
        </Box>
        <Box sx={leftBox(theme)}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <Typography
              variant="text2"
              sx={leftTitle(theme)}
              textAlign="center"
            >
              {isMobile
                ? t("airdrop.allocation.detailedInfo")
                : t("airdrop.allocation.yourAddress")}
            </Typography>
            {!isMobile && (
              <AllocationBox allocation="87453gqhrq-485hrq8gv4rb" />
            )}
            <Parameters />
          </Box>
          <Typography
            sx={footerText(theme)}
            variant="text4"
            color={COLORS.santasGrey}
          >
            {t("footer.rights")}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
