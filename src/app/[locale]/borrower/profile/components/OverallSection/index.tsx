import * as React from "react"

import { Box, Divider, Typography } from "@mui/material"

import {
  MarketParametersContainer,
  MarketParametersRowContainer,
  MarketParametersRowsDivider,
} from "@/app/[locale]/borrower/profile/style"
import { MarketParametersItem } from "@/components/MarketParameters/components/MarketParametersItem"

export type OverallSectionProps = {
  name?: string
  website?: string
  headquarters?: string
  founded?: string
  marketsAmount?: string
  totalBorrowedAmount?: string
  defaults?: string
}

export const OverallSection = ({
  name,
  website,
  headquarters,
  founded,
  marketsAmount,
  totalBorrowedAmount,
  defaults,
}: OverallSectionProps) => {
  const a = ""

  return (
    <Box>
      <Typography variant="title3">Overall Info</Typography>

      <Box sx={MarketParametersContainer}>
        <Box sx={MarketParametersRowContainer}>
          <MarketParametersItem
            title="Legal Name"
            value={name ?? ""}
            link={website}
          />
          <Divider sx={MarketParametersRowsDivider} />

          {headquarters && (
            <MarketParametersItem
              title="Headquarters"
              value={headquarters ?? ""}
            />
          )}
          <Divider sx={MarketParametersRowsDivider} />

          {founded && (
            <MarketParametersItem title="Founded" value={founded ?? ""} />
          )}
          <Divider sx={MarketParametersRowsDivider} />
        </Box>

        <Box sx={MarketParametersRowContainer}>
          <MarketParametersItem title="Markets" value={marketsAmount || ""} />
          <Divider sx={MarketParametersRowsDivider} />

          <MarketParametersItem
            title="Total amount borrowed"
            value={totalBorrowedAmount || ""}
          />
          <Divider sx={MarketParametersRowsDivider} />

          <MarketParametersItem
            title="Defaults"
            value={defaults || ""}
            tooltipText="TBD"
          />
          <Divider sx={MarketParametersRowsDivider} />
        </Box>
      </Box>
    </Box>
  )
}
