import * as React from "react"

import { Box, Typography, Divider } from "@mui/material"

import LinkIcon from "@/assets/icons/link_icon.svg"
import { LinkGroup } from "@/components/LinkComponent"
import { ButtonStyle } from "@/components/LinkComponent/style"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

type OutstandingRowProps = {
  lender: string
  transactionId: string
  amount: string
  dateSubmitted: string
  isLast?: boolean
  chainId?: number
}

export const WithdrawalsMobileTableItem = ({
  lender,
  transactionId,
  amount,
  dateSubmitted,
  isLast = false,
  chainId,
}: OutstandingRowProps) => {
  const { getAddressUrl, getTxUrl } = useBlockExplorer({ chainId })

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          padding: "12px 10px 12px 0",
          marginX: "4px",
        }}
      >
        <Box
          sx={{
            display: "flex",
            width: "100%",
            justifyContent: "space-between",
          }}
        >
          <Box display="flex" alignItems="center" gap="4px">
            <Typography variant="mobText3">{trimAddress(lender)}</Typography>
            <LinkGroup
              type="withCopy"
              linkValue={getAddressUrl(lender)}
              iconSize="16px"
            />
          </Box>

          <Typography variant="mobText3">{amount}</Typography>
        </Box>

        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="text4" sx={{ color: COLORS.santasGrey }}>
            {dateSubmitted}
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
              {trimAddress(transactionId)}
            </Typography>
            <LinkGroup
              type="withCopy"
              copyValue={transactionId}
              linkValue={getTxUrl(transactionId)}
              iconSize="12px"
            />
          </Box>
        </Box>
      </Box>
      {!isLast && <Divider sx={{ mb: 1 }} />}
    </Box>
  )
}
