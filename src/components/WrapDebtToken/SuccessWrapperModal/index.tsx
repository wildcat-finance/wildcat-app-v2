import * as React from "react"

import { Box, Dialog, Typography } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"

import CircledCheckBlue from "@/assets/icons/circledCheckBlue_icon.svg"
import ConfettiPattern from "@/assets/icons/confetti_pattern.svg"
import { LinkGroup } from "@/components/LinkComponent"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { COLORS } from "@/theme/colors"

export type SuccessWrapperModalProps = {
  isWrapping: boolean
  open: boolean
  onClose: () => void
  initialAmount: string | undefined
  initialAsset: string
  finalAmount: string | undefined
  finalAsset: string
  txHash?: string
}

export const SuccessWrapperModal = ({
  isWrapping,
  open,
  onClose,
  initialAmount,
  initialAsset,
  finalAmount,
  finalAsset,
  txHash,
}: SuccessWrapperModalProps) => {
  const { getTxUrl } = useBlockExplorer()

  if (initialAmount === undefined || finalAmount === undefined) return null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      sx={{
        "& .MuiDialog-paper": {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          // height: "212px",
          maxWidth: "818px",
          width: "100%",
          padding: "20px 20px 20px 20px",
          border: "none",
          borderRadius: "20px",
          margin: 0,
          overflow: "visible",
        },
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translate(-50%, -25%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        <SvgIcon
          component={ConfettiPattern}
          sx={{
            width: "auto",
            height: "auto",
            fontSize: "inherit",
          }}
          inheritViewBox
        />
      </Box>

      <SvgIcon
        fontSize="colossal"
        sx={{ marginTop: "15px", marginBottom: "16px" }}
      >
        <CircledCheckBlue />
      </SvgIcon>

      <Typography variant="text1" sx={{ marginBottom: "8px" }}>
        {initialAmount} {initialAsset} {isWrapping ? "wrapped" : "unwrapped"}{" "}
        {isWrapping ? "in" : "to"} {finalAsset} {finalAmount}
      </Typography>
      <Typography
        variant="text3"
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
    </Dialog>
  )
}
