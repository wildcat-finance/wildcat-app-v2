import { Box, Button, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketCycleChip } from "@/components/MarketCycleChip"
import { MarketHeaderProps } from "@/components/MarketHeader/interface"
import {
  ElseButtonContainer,
  ElseButtonText,
} from "@/components/MarketHeader/style"
import { secondsToDays } from "@/utils/formatters"
import { getMarketStatus } from "@/utils/marketStatus"

export const MarketHeader = ({ market, isLoading }: MarketHeaderProps) => {
  const { t } = useTranslation()

  if (!market) return null

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
    <Box display="flex" flexDirection="column" rowGap="20px">
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box display="flex" columnGap="8px">
          <Typography variant="title1">
            {market ? market.name : "Loading"}
          </Typography>
          <Typography variant="text4">
            {market ? market.underlyingToken.symbol : "Loading"}
          </Typography>
        </Box>
        <Box display="flex" columnGap="12px">
          <MarketStatusChip status={marketStatus} variant="filled" />
          <MarketCycleChip color="blue" time="3m 45s" />
        </Box>
      </Box>

      <Box display="flex" columnGap="6px">
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
