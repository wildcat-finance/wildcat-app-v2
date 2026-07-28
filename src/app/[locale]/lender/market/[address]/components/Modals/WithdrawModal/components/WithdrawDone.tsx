import * as React from "react"

import { Box, IconButton, SvgIcon, Typography } from "@mui/material"

import {
  FinalModalCloseButton,
  FinalModalMainContainer,
  FinalModalSubtitle,
  FinalModalTypoBox,
} from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/style"
import CircledCheckBlue from "@/assets/icons/circledCheckBlue_icon.svg"
import Cross from "@/assets/icons/cross_icon.svg"
import { LinkGroup } from "@/components/LinkComponent"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"

export type WithdrawDoneProps = {
  title: string
  subtitle: string
  txHash?: string
  onClose: () => void
}

/**
 * Terminal screen for the withdraw flow.
 *
 * Unlike the shared SuccessModal, this view sits above a footer button, so the
 * confirmation block is centred in the space that is left while the explorer
 * link is pushed down next to the button.
 */
export const WithdrawDone = ({
  title,
  subtitle,
  txHash,
  onClose,
}: WithdrawDoneProps) => {
  const { getTxUrl } = useBlockExplorer()

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <IconButton disableRipple onClick={onClose}>
          <SvgIcon fontSize="big" sx={FinalModalCloseButton}>
            <Cross />
          </SvgIcon>
        </IconButton>
      </Box>

      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box sx={FinalModalMainContainer}>
          <SvgIcon fontSize="colossal">
            <CircledCheckBlue />
          </SvgIcon>

          <Box sx={FinalModalTypoBox}>
            <Typography variant="title3">{title}</Typography>
            <Typography variant="text3" sx={FinalModalSubtitle}>
              {subtitle}
            </Typography>
          </Box>
        </Box>
      </Box>

      {!!txHash && (
        <LinkGroup
          type="etherscan"
          linkValue={getTxUrl(txHash)}
          groupSX={{ padding: "8px", justifyContent: "center" }}
        />
      )}
    </Box>
  )
}
