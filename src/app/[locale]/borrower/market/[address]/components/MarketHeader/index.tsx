import * as React from "react"

import { Box, Button, Skeleton, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { MarketHeaderProps } from "@/app/[locale]/borrower/market/[address]/components/MarketHeader/interface"
import {
  ElseButtonContainer,
  ElseButtonText,
  MarketHeaderButtonsContainer,
  MarketHeaderContainer,
  MarketHeaderStatusContainer,
  MarketHeaderTitleContainer,
  MarketHeaderUpperContainer,
} from "@/app/[locale]/borrower/market/[address]/components/MarketHeader/style"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketCycleChip } from "@/components/MarketCycleChip"
import { secondsToDays } from "@/utils/formatters"
import { getMarketStatus } from "@/utils/marketStatus"

export const MarketHeader = ({ market }: MarketHeaderProps) => {
  const { t } = useTranslation()

  const delinquencyPeriod =
    market.timeDelinquent > market.delinquencyGracePeriod
      ? 0
      : market.delinquencyGracePeriod - market.timeDelinquent
  const penaltyPeriod = market.timeDelinquent - market.delinquencyGracePeriod
  const marketStatus = {
    status: getMarketStatus(
      market.isClosed,
      market.isDelinquent,
      market.isIncurringPenalties,
    ),
    healthyPeriod: secondsToDays(Math.abs(market.timeDelinquent)),
    penaltyPeriod: secondsToDays(penaltyPeriod),
    delinquencyPeriod: secondsToDays(delinquencyPeriod),
  }

  return (
    <Box sx={MarketHeaderContainer}>
      <Box sx={MarketHeaderUpperContainer}>
        <Box sx={MarketHeaderTitleContainer}>
          <Typography variant="title1">{market.name}</Typography>
          <Typography variant="text4">
            {market.underlyingToken.symbol}
          </Typography>
        </Box>
        <Box sx={MarketHeaderStatusContainer}>
          <MarketStatusChip status={marketStatus} variant="filled" />
          <MarketCycleChip color="blue" time="3m 45s" />
        </Box>
      </Box>

      <Box sx={MarketHeaderButtonsContainer}>
        <Button variant="outlined" color="secondary" size="small">
          {t("borrowerMarketDetails.buttons.kyc")}
        </Button>
        <Button variant="outlined" color="secondary" size="small">
          {t("borrowerMarketDetails.buttons.mla")}
        </Button>
        <Button variant="outlined" color="secondary" size="small">
          {t("borrowerMarketDetails.buttons.capacity")}
        </Button>
        <Button variant="outlined" color="secondary" size="small">
          {t("borrowerMarketDetails.buttons.apr")}
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
