import * as React from "react"

import { Button, Typography } from "@mui/material"
import { HooksKind } from "@wildcatfi/wildcat-sdk"

import { MarketTypeChip } from "@/components/@extended/MarketTypeChip"
import { InfoCard } from "@/components/Mobile/Card/InfoCard"
import { TooltipButton } from "@/components/TooltipButton"
import { COLORS } from "@/theme/colors"
import { formatBps } from "@/utils/formatters"

import { HealthyChip } from "../HealthyChip"

export const OtherMarkets = () => {
  const mockKind = HooksKind.FixedTerm
  const mockFixedPeriod = 3 * 24 * 60 * 60 * 1000
  const mockAprBps = 950
  return (
    <InfoCard
      statusChip={<HealthyChip />}
      cycleChip={
        <MarketTypeChip kind={mockKind} fixedPeriod={mockFixedPeriod} />
      }
      statusText={`APR ${formatBps(mockAprBps)}%`}
      statusTooltip={<TooltipButton value="APR" />}
      title="Binance Smart Chain"
      value="5,000.00 MATIC"
      leftText="DeFi Innovations"
      rightText="available to lend"
      bottomLeftText="0 MATIC deposited"
      leftButton={
        <Button variant="outlined" size="small" color="secondary">
          <Typography variant="text4" color={COLORS.blackRock}>
            More
          </Typography>
        </Button>
      }
      rightButton={
        <Button variant="contained" size="small" color="primary">
          <Typography variant="text4" color={COLORS.white}>
            Onboard
          </Typography>
        </Button>
      }
    />
  )
}
