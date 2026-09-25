import * as React from "react"

import { Box } from "@mui/material"
import { useTranslation } from "react-i18next"

import { TooltipButton } from "@/components/TooltipButton"

export const TotalDebtHeader = ({ label }: { label?: string }) => {
  const { t } = useTranslation()

  return (
    <Box display="flex" columnGap="4px" alignItems="center">
      {label ?? t("common.fields.totalDebt")}
      <TooltipButton value={t("common.fields.totalDebtTooltip")} />
    </Box>
  )
}
