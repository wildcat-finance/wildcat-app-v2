import * as React from "react"

import { Box, IconButton, Typography } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import { Trans } from "react-i18next"

import {
  FinalModalCloseButton,
  FinalModalContentContainer,
  FinalModalHeader,
  FinalModalMainContainer,
  FinalModalSubtitle,
  FinalModalTypoBox,
} from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/style"
import CircledCheckBlue from "@/assets/icons/circledCheckBlue_icon.svg"
import Cross from "@/assets/icons/cross_icon.svg"
import { LinkGroup } from "@/components/LinkComponent"
import { EtherscanBaseUrl } from "@/config/network"

export const SuccessModal = ({
  onClose,
  txHash,
  title,
  subtitle,
}: {
  onClose: () => void
  txHash?: string
  title?: string
  subtitle?: string
}) => (
  <>
    <Box sx={FinalModalHeader}>
      <Box width="20px" height="20px" />
      <IconButton disableRipple onClick={onClose}>
        <SvgIcon fontSize="big" sx={FinalModalCloseButton}>
          <Cross />
        </SvgIcon>
      </IconButton>
    </Box>

    <Box padding="0 24px" sx={FinalModalContentContainer}>
      <Box margin="auto" sx={FinalModalMainContainer}>
        <SvgIcon fontSize="colossal">
          <CircledCheckBlue />
        </SvgIcon>

        <Box sx={FinalModalTypoBox}>
          <Typography variant="title3">
            {title ?? (
              <Trans i18nKey="borrowerMarketDetails.modals.success.title" />
            )}
          </Typography>
          <Typography variant="text3" sx={FinalModalSubtitle}>
            {subtitle ?? (
              <Trans i18nKey="borrowerMarketDetails.modals.success.subtitle" />
            )}
          </Typography>
        </Box>
      </Box>

      {txHash !== "" && txHash !== undefined && (
        <LinkGroup
          type="etherscan"
          linkValue={`${EtherscanBaseUrl}/tx/${txHash}`}
          groupSX={{ padding: "8px" }}
        />
      )}
    </Box>
  </>
)
