import * as React from "react"

import { Box, Divider, Tooltip, Typography } from "@mui/material"
import { MarketRecord } from "@wildcatfi/wildcat-sdk"

import { LinkGroup } from "@/components/LinkComponent"
import { COLORS } from "@/theme/colors"
import { timestampToDateFormatted, trimAddress } from "@/utils/formatters"
import { getRecordText } from "@/utils/marketRecords"

type MobileMarketRecordItemProps = {
  record: MarketRecord
  lenderNames: { [key: string]: string }
  borrowerName: string
  txUrl: string
  isLast?: boolean
}

export const MobileMarketRecordItem = ({
  record,
  lenderNames,
  borrowerName,
  txUrl,
  isLast = false,
}: MobileMarketRecordItemProps) => {
  const displayText = getRecordText(record, lenderNames, borrowerName)
  const rawText = getRecordText(record, lenderNames, borrowerName, true)

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          padding: "12px 0",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
            {timestampToDateFormatted(record.blockTimestamp)}
          </Typography>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "2px 6px 2px 8px",
              borderRadius: "6px",
              bgcolor: COLORS.whiteSmoke,
            }}
          >
            <Typography variant="text4">
              {trimAddress(record.transactionHash)}
            </Typography>
            <LinkGroup
              type="withCopy"
              copyValue={record.transactionHash}
              linkValue={txUrl}
              iconSize="12px"
            />
          </Box>
        </Box>

        <Tooltip title={rawText} placement="top" arrow>
          <Typography variant="mobText3" sx={{ wordBreak: "break-word" }}>
            {displayText}
          </Typography>
        </Tooltip>
      </Box>
      {!isLast && <Divider />}
    </Box>
  )
}
