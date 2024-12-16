import * as React from "react"

import { Box, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { COLORS } from "@/theme/colors"

import { TitleContainer, TitleDot } from "./style"

export const StepCounterTitle = ({
  current,
  total,
}: {
  current?: number
  total: number
}) => {
  const { t } = useTranslation()

  return (
    <Box sx={TitleContainer}>
      <Typography variant="text3" color={COLORS.santasGrey}>
        {t("createNewMarket.title")}
      </Typography>

      {current && (
        <>
          <Box sx={TitleDot} />

          <Typography variant="text3" color={COLORS.santasGrey}>
            {`${current}/${total}`}
          </Typography>
        </>
      )}
    </Box>
  )
}
