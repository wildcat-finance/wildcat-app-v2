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
import { useBlockExplorer } from "@/hooks/useBlockExplorer"

export const LoadingModal = ({
  txHash,
  title,
  subtitle,
}: {
  txHash?: string
  title?: string
  subtitle?: string
}) => {
  const { getTxUrl } = useBlockExplorer()

  return (
    <>
      <Box width="20px" height="20px" />

      <Box padding="0 24px" sx={FinalModalContentContainer}>
        <Box margin="auto" sx={FinalModalMainContainer}>
          <Loader />

          <Box sx={FinalModalTypoBox}>
            <Typography variant="text1">
              {title ?? (
                <Trans i18nKey="borrowerMarketDetails.modals.loading.title" />
              )}
            </Typography>
            <Typography variant="text3" sx={FinalModalSubtitle}>
              {subtitle ?? (
                <Trans i18nKey="borrowerMarketDetails.modals.loading.subtitle" />
              )}
            </Typography>
          </Box>
        </Box>

        <Box height="36px" width="100%">
          {txHash !== "" && txHash !== undefined && (
            <LinkGroup
              type="etherscan"
              linkValue={getTxUrl(txHash)}
              groupSX={{ padding: "8px" }}
            />
          )}
        </Box>
      </Box>
    </>
  )
}
