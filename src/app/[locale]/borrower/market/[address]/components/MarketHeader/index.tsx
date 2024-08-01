import * as React from "react"

import { Box, Typography } from "@mui/material"
import humanizeDuration from "humanize-duration"
import { useTranslation } from "react-i18next"

import { useGetWithdrawals } from "@/app/[locale]/borrower/market/[address]/hooks/useGetWithdrawals"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketCycleChip } from "@/components/MarketCycleChip"
import { getMarketStatusChip } from "@/utils/marketStatus"

import { MarketHeaderProps } from "./interface"
import {
  MarketHeaderStatusContainer,
  MarketHeaderTitleContainer,
  MarketHeaderUpperContainer,
} from "./style"

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
    <Box sx={MarketHeaderUpperContainer}>
      <Box sx={MarketHeaderTitleContainer}>
        <Typography
          variant="title1"
          sx={{
            maxWidth: "550px",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            overflow: "hidden",
          }}
        >
          {market.name}
        </Typography>
        <Typography variant="text4">{market.underlyingToken.symbol}</Typography>
      </Box>
      <Box sx={MarketHeaderStatusContainer}>
        <MarketStatusChip status={marketStatus} variant="filled" />
        {cycleDuration && <MarketCycleChip color="blue" time={cycleDuration} />}
      </Box>
    </Box>
  )
}
