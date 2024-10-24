import * as React from "react"

import { Box, Typography } from "@mui/material"
import { Trans } from "react-i18next"

import {
  FinalModalContentContainer,
  FinalModalMainContainer,
  FinalModalSubtitle,
  FinalModalTypoBox,
} from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/style"
import { LinkGroup } from "@/components/LinkComponent"
import { Loader } from "@/components/Loader"
import { EtherscanBaseUrl } from "@/config/network"

export const LoadingModal = ({ txHash }: { txHash?: string }) => (
  <>
    <Box width="20px" height="20px" />

    <Box padding="0 24px" sx={FinalModalContentContainer}>
      <Box margin="auto" sx={FinalModalMainContainer}>
        <Loader />

        <Box sx={FinalModalTypoBox}>
          <Typography variant="text1">
            <Trans i18nKey="borrowMarketDetails.modals.loading.title" />
          </Typography>
          <Typography variant="text3" sx={FinalModalSubtitle}>
            <Trans i18nKey="borrowMarketDetails.modals.loading.subtitle" />
          </Typography>
        </Box>
      </Box>

      <Box height="36px" width="100%">
        {txHash !== "" && txHash !== undefined && (
          <LinkGroup
            type="etherscan"
            linkValue={`${EtherscanBaseUrl}/tx/${txHash}`}
            groupSX={{ padding: "8px" }}
          />
        )}
      </Box>
    </Box>
  </>
)
