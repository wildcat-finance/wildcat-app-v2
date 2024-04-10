"use client"

import { Box, Button, Typography } from "@mui/material"
import { MarketStatusChip } from "@/components/extended/MarketStatusChip"
import { MarketCycleChip } from "@/components/MarketCycleChip"
import {
  ElseButtonContainer,
  ElseButtonText,
} from "@/components/MarketHeader/style"
import { useTranslation } from "react-i18next"

export const MarketHeader = () => {
  const { t } = useTranslation()

  return (
    <Box display="flex" flexDirection="column" rowGap="20px">
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box display="flex" columnGap="8px">
          <Typography variant="title1">Market Name</Typography>
          <Typography variant="text4">WBTC</Typography>
        </Box>
        <Box display="flex" columnGap="12px">
          <MarketStatusChip status="healthy" variant="filled" />
          <MarketCycleChip color="blue" time="3m 45s" />
        </Box>
      </Box>

      <Box display="flex" columnGap="6px">
        <Button variant="outlined" color="secondary" size="small">
          {t("editLendersButton")}
        </Button>
        <Button variant="outlined" color="secondary" size="small">
          {t("adjustCapacityButton")}
        </Button>
        <Button variant="outlined" color="secondary" size="small">
          {t("adjustAPRButton")}
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          size="small"
          sx={ElseButtonContainer}
        >
          <Typography variant="text4" sx={ElseButtonText}>
            ...
          </Typography>
        </Button>
      </Box>
    </Box>
  )
}
