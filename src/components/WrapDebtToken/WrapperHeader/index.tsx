import React from "react"

import { Box, Button, Divider, Typography } from "@mui/material"

import { LinkGroup } from "@/components/LinkComponent"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { useAppSelector } from "@/store/hooks"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

export type WrapperFormHeaderProps = {
  contractAddress: string
  wrapperName?: string
  wrapperSymbol?: string
  onAddMarketToken?: () => void
  onAddWrappedToken?: () => void
  disableAddMarketToken?: boolean
  disableAddWrappedToken?: boolean
}

export const WrapperHeader = ({
  contractAddress,
  wrapperName,
  wrapperSymbol,
  onAddMarketToken,
  onAddWrappedToken,
  disableAddMarketToken,
  disableAddWrappedToken,
}: WrapperFormHeaderProps) => {
  const { getAddressUrl } = useBlockExplorer()
  const isMobile = useMobileResolution()
  const isMobileOpenState = useAppSelector(
    (state) => state.wrapDebtTokenFlow.isMobileOpenedState,
  )

  return (
    <>
      {isMobileOpenState && isMobile && (
        <Divider sx={{ marginBottom: "26px" }} />
      )}

      {!isMobile && (
        <Typography
          variant="text3"
          color={COLORS.manate}
          sx={{ marginBottom: "6px" }}
        >
          Wrapper contract
        </Typography>
      )}

      <Box
        sx={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobileOpenState ? "center" : "flex-start",
          gap: isMobile ? "6px" : "11px",
          marginBottom: "12px",
          marginTop: isMobileOpenState && isMobile ? "26px" : "0px",
        }}
      >
        <Typography variant={isMobile ? "mobH3" : "title3"}>
          {wrapperName || "Wrapped Token"}
        </Typography>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            padding: "2px 8px",
            background: COLORS.glitter,
            borderRadius: "26px",
          }}
        >
          <Typography
            variant={isMobile ? "mobText3" : "text3"}
            color={COLORS.ultramarineBlue}
          >
            {wrapperSymbol || "WRAP"}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          width: "100%",
          display: "flex",
          flexDirection: isMobile && isMobileOpenState ? "column" : "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: isMobile && !isMobileOpenState ? "12px" : "0",
        }}
      >
        <Box
          sx={{
            // eslint-disable-next-line no-nested-ternary
            width: isMobile
              ? isMobileOpenState
                ? "fit-content"
                : "100%"
              : "fit-content",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "6px",
            padding: isMobile ? "6px 12px" : "4px 8px 4px 12px",
            background: isMobile ? COLORS.whiteSmoke : COLORS.blackHaze,
            borderRadius: isMobile ? "28px" : "8px",
          }}
        >
          {/* Change for wrapper address */}
          <Typography variant={isMobile ? "mobText3" : "text3"}>
            {trimAddress(contractAddress)}
          </Typography>

          <LinkGroup
            copyValue={contractAddress}
            linkValue={getAddressUrl(contractAddress)}
          />
        </Box>

        {isMobileOpenState && (
          <Box
            sx={{
              display: "flex",
              gap: "6px",
              marginTop: isMobile && isMobileOpenState ? "20px" : 0,
            }}
          >
            <Button
              variant="outlined"
              size="small"
              color="secondary"
              onClick={onAddMarketToken}
              disabled={!onAddMarketToken || disableAddMarketToken}
            >
              + Add market token
            </Button>

            <Button
              variant="outlined"
              size="small"
              color="secondary"
              onClick={onAddWrappedToken}
              disabled={!onAddWrappedToken || disableAddWrappedToken}
            >
              + Add wrapped token
            </Button>
          </Box>
        )}
      </Box>

      {isMobileOpenState && (
        <Divider
          sx={{
            margin: isMobile ? "20px 16px" : "24px 0 20px",
          }}
        />
      )}
    </>
  )
}
