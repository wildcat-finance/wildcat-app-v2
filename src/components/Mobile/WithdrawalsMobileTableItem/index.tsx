import * as React from "react"

import { Box, Typography, Divider, SvgIcon, IconButton } from "@mui/material"

import LinkIcon from "@/assets/icons/link_icon.svg"
import { LinkGroup } from "@/components/LinkComponent"
import { ButtonStyle } from "@/components/LinkComponent/style"
import { EtherscanBaseUrl } from "@/config/network"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

type OutstandingRowProps = {
  lender: string
  transactionId: string
  amount: string
  dateSubmitted: string
}

export const WithdrawalsMobileTableItem = ({
  lender,
  transactionId,
  amount,
  dateSubmitted,
}: OutstandingRowProps) => (
  <Box>
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      sx={{ mx: "4px" }}
    >
      <Box display="flex" flexDirection="column" gap="4px">
        <Box display="flex" alignItems="center" gap="4px">
          <Typography variant="text3" sx={{ color: COLORS.blackRock }}>
            {lender ? trimAddress(lender) : ""}
          </Typography>
          <IconButton disableRipple sx={ButtonStyle}>
            <SvgIcon fontSize="medium">
              <LinkIcon />
            </SvgIcon>
          </IconButton>
        </Box>
        <Box display="flex" alignItems="center">
          <Typography variant="text4" fontWeight="500">
            {trimAddress(transactionId)}
          </Typography>
          <LinkGroup
            type="withCopy"
            copyValue={transactionId}
            linkValue={`${EtherscanBaseUrl}/address/${transactionId}`}
          />
        </Box>
      </Box>
      <Box textAlign="right" display="flex" flexDirection="column">
        <Typography variant="text3" sx={{ color: COLORS.blackRock }}>
          {amount}
        </Typography>
        <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
          {dateSubmitted}
        </Typography>
      </Box>
    </Box>
    <Divider sx={{ my: 1 }} />
  </Box>
)
