"use client"

import { Dispatch, SetStateAction } from "react"

import { Box, IconButton, SvgIcon, Typography, useTheme } from "@mui/material"
import LinearProgress from "@mui/material/LinearProgress"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"

import Arrow from "@/assets/icons/arrowLeft_icon.svg"
import { COLORS } from "@/theme/colors"

import { containerBox } from "./styles"

export type ProgressHeaderProps = {
  progress: number
  setProgress: Dispatch<SetStateAction<number>>
}

export const ProgressHeader = ({
  progress,
  setProgress,
}: ProgressHeaderProps) => {
  const theme = useTheme()
  const router = useRouter()
  const { t } = useTranslation()
  const handleBack = () => {
    if (progress - 20) {
      setProgress(progress - 20)
    } else {
      router.back()
    }
  }

  return (
    <Box sx={containerBox(theme)}>
      <Box
        sx={{
          width: "100%",
          px: "20px",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <IconButton onClick={handleBack} disableRipple sx={{ height: "20px" }}>
          <SvgIcon sx={{ fontSize: "20px" }}>
            <Arrow />
          </SvgIcon>
        </IconButton>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px",
          }}
        >
          <Typography variant="text3" color={COLORS.santasGrey}>
            {t("delegation.claimTokens")}
          </Typography>
          <Typography variant="text1">
            {t("delegation.delegationTo")}
          </Typography>
        </Box>

        <Box height={20} width={20} />
      </Box>

      <Box sx={{ width: "100%", marginTop: "20px" }}>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: "2px",
            backgroundColor: COLORS.whiteLilac,
            "& .MuiLinearProgress-bar": {
              backgroundColor: COLORS.ultramarineBlue,
            },
          }}
        />
      </Box>
    </Box>
  )
}
