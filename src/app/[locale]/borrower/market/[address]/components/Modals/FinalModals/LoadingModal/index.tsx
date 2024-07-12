import * as React from "react"

import { Box, Typography } from "@mui/material"

import { LinkGroup } from "@/components/LinkComponent"
import { Loader } from "@/components/Loader"
import { EtherscanBaseUrl } from "@/config/network"

import {
  FinalModalContentContainer,
  FinalModalSubtitle,
  FinalModalTypoBox,
} from "../style"

export const LoadingModal = ({ txHash }: { txHash?: string }) => (
  <Box height="100%" padding="24px">
    <Box sx={FinalModalContentContainer} rowGap="24px">
      <Loader />

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <Box sx={FinalModalTypoBox}>
          <Typography variant="text1">Just wait a bit ...</Typography>
          <Typography variant="text3" sx={FinalModalSubtitle}>
            Transaction is in process.
          </Typography>
        </Box>
      </Box>
    </Box>
    {txHash !== "" && (
      <LinkGroup
        type="etherscan"
        linkValue={`${EtherscanBaseUrl}/tx/${txHash}`}
      />
    )}
  </Box>
)
