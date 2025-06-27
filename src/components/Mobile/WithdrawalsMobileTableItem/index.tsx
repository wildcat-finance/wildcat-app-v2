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
  isLast?: boolean
}

export const WithdrawalsMobileTableItem = ({
  lender,
  transactionId,
  amount,
  dateSubmitted,
  isLast = false,
}: OutstandingRowProps) => (
  <Box>
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        padding: "12px 10px 12px 0",
        marginX: "4px",
      }}
    >
      <Box
        sx={{ display: "flex", width: "100%", justifyContent: "space-between" }}
      >
        <Box display="flex" alignItems="center" gap="4px">
          <Typography variant="mobText3">{trimAddress(lender)}</Typography>
          <IconButton disableRipple sx={ButtonStyle}>
            <SvgIcon fontSize="small">
              <LinkIcon />
            </SvgIcon>
          </IconButton>
        </Box>

        <Typography variant="mobText3">{amount}</Typography>
      </Box>

      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "flex-end",
          gap: "4px",
          alignItems: "center",
        }}
      >
        <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
          {dateSubmitted}
        </Typography>

        <Box
          sx={{
            width: "4px",
            height: "4px",
            borderRadius: "50%",
            backgroundColor: COLORS.santasGrey,
          }}
        />

        <Box display="flex" alignItems="center" gap="4px">
          <Typography variant="text4">{trimAddress(transactionId)}</Typography>
          <LinkGroup
            type="withCopy"
            copyValue={transactionId}
            linkValue={`${EtherscanBaseUrl}/address/${transactionId}`}
            iconSize="12px"
          />
        </Box>
      </Box>
    </Box>
    {!isLast && <Divider sx={{ mb: 1 }} />}
  </Box>
)
