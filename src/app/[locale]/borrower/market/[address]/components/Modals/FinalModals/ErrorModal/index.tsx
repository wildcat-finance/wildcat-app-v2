import * as React from "react"

import { Box, Button, IconButton, Typography } from "@mui/material"
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
import CircledCrossRed from "@/assets/icons/circledCrossRed_icon.svg"
import Cross from "@/assets/icons/cross_icon.svg"
import { LinkGroup } from "@/components/LinkComponent"
import { EtherscanBaseUrl } from "@/config/network"

export const ErrorModal = ({
  onTryAgain,
  onClose,
  txHash,
  title,
  subtitle,
}: {
  onTryAgain?: () => void
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
          <CircledCrossRed />
        </SvgIcon>

        <Box sx={FinalModalTypoBox}>
          <Typography variant="title3">
            {title ?? (
              <Trans i18nKey="borrowerMarketDetails.modals.error.wait" />
            )}
          </Typography>
          <Typography variant="text3" sx={FinalModalSubtitle}>
            {subtitle ?? (
              <Trans i18nKey="borrowerMarketDetails.modals.error.subtitle" />
            )}
          </Typography>
        </Box>
      </Box>

      {txHash !== "" && txHash !== undefined && (
        <LinkGroup
          type="etherscan"
          linkValue={`${EtherscanBaseUrl}/tx/${txHash}`}
          groupSX={{ marginBottom: "16px" }}
        />
      )}

      {onTryAgain && (
        <Button variant="contained" size="large" onClick={onTryAgain} fullWidth>
          <Trans i18nKey="borrowerMarketDetails.modals.error.tryAgain" />
        </Button>
      )}
    </Box>
  </>
)
