import * as React from "react"

import { Box, Button, Typography } from "@mui/material"
import humanizeDuration from "humanize-duration"
import { useTranslation } from "react-i18next"

import { CapacityModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/CapacityModal"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketCycleChip } from "@/components/MarketCycleChip"
import { getMarketStatusChip } from "@/utils/marketStatus"

import { MarketHeaderProps } from "./interface"
import {
  ElseButtonContainer,
  ElseButtonText,
  MarketHeaderButtonsContainer,
  MarketHeaderContainer,
  MarketHeaderStatusContainer,
  MarketHeaderTitleContainer,
  MarketHeaderUpperContainer,
} from "./style"
import { useGetWithdrawals } from "../../hooks/useGetWithdrawals"

export const MarketHeader = ({ marketAccount }: MarketHeaderProps) => {
  const { t } = useTranslation()

  const { market } = marketAccount

  const { data } = useGetWithdrawals(market)

  const cycleStart = data.activeWithdrawal?.requests[0]?.blockTimestamp
  const cycleEnd =
    cycleStart !== undefined ? cycleStart + market.withdrawalBatchDuration : 0
  const cycleDuration =
    cycleStart &&
    humanizeDuration((cycleEnd - cycleStart) * 1000, {
      round: true,
      largest: 2,
      units: ["h", "m", "s"],
    })

  const marketStatus = getMarketStatusChip(market)

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
          {cycleDuration && (
            <MarketCycleChip color="blue" time={cycleDuration} />
          )}
        </Box>
      </Box>

      <Box sx={MarketHeaderButtonsContainer}>
        {/* <Button variant="outlined" color="secondary" size="small"> */}
        {/*  {t("borrowerMarketDetails.buttons.kyc")} */}
        {/* </Button> */}
        {/* <Button variant="outlined" color="secondary" size="small"> */}
        {/*  {t("borrowerMarketDetails.buttons.mla")} */}
        {/* </Button> */}
        <CapacityModal marketAccount={marketAccount} />
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
