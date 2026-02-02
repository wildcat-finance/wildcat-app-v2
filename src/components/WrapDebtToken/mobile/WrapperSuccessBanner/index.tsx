import React from "react"

import { Box, SvgIcon, Typography } from "@mui/material"

import CircledCheckBlue from "@/assets/icons/circledCheckBlue_icon.svg"
import { LinkGroup } from "@/components/LinkComponent"
import { SuccessWrapperModalProps } from "@/components/WrapDebtToken/SuccessWrapperModal"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { COLORS } from "@/theme/colors"

export type WrapperSuccessBannerProps = {
  isWrapping: boolean
  initialAmount: string | undefined
  initialAsset: string
  finalAmount: string | undefined
  finalAsset: string
  txHash?: string
}

export const WrapperSuccessBanner = ({
  isWrapping,
  initialAmount,
  initialAsset,
  finalAmount,
  finalAsset,
  txHash,
}: SuccessWrapperModalProps) => {
  const { getTxUrl } = useBlockExplorer()

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "212px",
        width: "100%",
        padding: "12px 20px 12px 20px",
        borderRadius: "20px",
        margin: 0,
        overflow: "visible",
        backgroundColor: COLORS.hintOfRed,
      }}
    >
      <SvgIcon
        fontSize="colossal"
        sx={{ marginTop: "15px", marginBottom: "16px" }}
      >
        <CircledCheckBlue />
      </SvgIcon>

      <Typography
        variant="mobText1"
        sx={{ marginBottom: "8px" }}
        textAlign="center"
      >
        {initialAmount} {initialAsset} {isWrapping ? "wrapped" : "unwrapped"}{" "}
        {isWrapping ? "in" : "to"} {finalAsset} {finalAmount}
      </Typography>
      <Typography
        variant="mobText3"
        textAlign="center"
        color={COLORS.manate}
        sx={{ marginBottom: "30px" }}
      >
        Any other message. You can close the window.
      </Typography>

      {txHash !== "" && txHash !== undefined && (
        <LinkGroup
          type="etherscan"
          linkValue={getTxUrl(txHash)}
          groupSX={{ marginBottom: "8px" }}
        />
      )}
    </Box>
  )
}
