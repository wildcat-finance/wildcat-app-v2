import * as React from "react"

import { Box, Typography, Divider, SvgIcon, IconButton } from "@mui/material"
import { GridColDef } from "@mui/x-data-grid"
import { TokenAmount, WithdrawalBatch } from "@wildcatfi/wildcat-sdk"

import LinkIcon from "@/assets/icons/link_icon.svg"
import { LinkGroup } from "@/components/LinkComponent"
import { ButtonStyle } from "@/components/LinkComponent/style"
import { COLORS } from "@/theme/colors"
import { timestampToDateFormatted, trimAddress } from "@/utils/formatters"

type OutstandingRowProps = {
  address: string
  amount: string
  timestamp: number
}

export const OutstandingRow = ({
  address,
  amount,
  timestamp,
}: OutstandingRowProps) => (
  <Box>
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      padding={1}
    >
      <Box display="flex" flexDirection="column" gap="4px">
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="text3" sx={{ color: COLORS.blackRock }}>
            Wildcat
          </Typography>
          <IconButton disableRipple sx={ButtonStyle}>
            <SvgIcon fontSize="medium">
              <LinkIcon />
            </SvgIcon>
          </IconButton>
        </Box>
        <Box display="flex" alignItems="center">
          <Typography variant="text4" fontWeight="500">
            {trimAddress(address)}
          </Typography>
          <LinkGroup
            type="withCopy"
            copyValue={address}
            linkValue={`https://etherscan.io/address/${address}`}
            groupSX={{ ml: 1 }}
          />
        </Box>
      </Box>
      <Box textAlign="right" display="flex" flexDirection="column">
        <Typography variant="text3" sx={{ color: COLORS.blackRock }}>
          {amount}
        </Typography>
        <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
          {timestampToDateFormatted(timestamp)}
        </Typography>
      </Box>
    </Box>
    <Divider sx={{ my: 1 }} />
  </Box>
)
