import React from "react"

import { Box, Button, Divider, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { LinkGroup } from "@/components/LinkComponent"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

export type WrapperFormHeaderProps = {
  contractAddress: string
}

export const WrapperHeader = ({ contractAddress }: WrapperFormHeaderProps) => {
  const { t } = useTranslation()
  const { getAddressUrl } = useBlockExplorer()

  return (
    <>
      <Divider sx={{ marginBottom: "26px" }} />

      <Typography
        variant="text3"
        color={COLORS.manate}
        sx={{ marginBottom: "6px" }}
      >
        Wrapper contract
      </Typography>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "11px",
          marginBottom: "12px",
        }}
      >
        {/* Change for wrapper name */}
        <Typography variant="title3">Wrapped Ethereum</Typography>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            padding: "2px 8px",
            background: COLORS.glitter,
            borderRadius: "26px",
          }}
        >
          {/* Change for wrapper symbol */}
          <Typography variant="text3" color={COLORS.ultramarineBlue}>
            WETH
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box
          sx={{
            width: "fit-content",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 8px 4px 12px",
            background: COLORS.blackHaze,
            borderRadius: "8px",
          }}
        >
          {/* Change for wrapper address */}
          <Typography variant="text3">
            {trimAddress(contractAddress)}
          </Typography>

          <LinkGroup
            copyValue={contractAddress}
            linkValue={getAddressUrl(contractAddress)}
          />
        </Box>

        <Box sx={{ display: "flex", gap: "6px" }}>
          <Button variant="outlined" size="small" color="secondary">
            + Add market token
          </Button>

          <Button variant="outlined" size="small" color="secondary">
            + Add wrapped token
          </Button>
        </Box>
      </Box>

      <Divider sx={{ margin: "24px 0 20px" }} />
    </>
  )
}
