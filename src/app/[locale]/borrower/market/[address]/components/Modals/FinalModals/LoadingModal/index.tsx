import * as React from "react"

import { Box, Typography } from "@mui/material"

import { LinkGroup } from "@/components/LinkComponent"
import { Loader } from "@/components/Loader"
import { EtherscanBaseUrl } from "@/config/network"

import {
  FinalModalContentContainer,
  FinalModalMainContainer,
  FinalModalSubtitle,
  FinalModalTypoBox,
} from "../style"

export const LoadingModal = ({ txHash }: { txHash?: string }) => (
  <>
    <Box width="20px" height="20px" />

    <Box padding="0 24px" sx={FinalModalContentContainer}>
      <Box margin="auto" sx={FinalModalMainContainer}>
        <Loader />

        <Box sx={FinalModalTypoBox}>
          <Typography variant="text1">Just wait a bit ...</Typography>
          <Typography variant="text3" sx={FinalModalSubtitle}>
            Transaction is in process.
          </Typography>
        </Box>
      </Box>

      <Box height="36px" width="100%">
        {txHash !== "" && (
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
