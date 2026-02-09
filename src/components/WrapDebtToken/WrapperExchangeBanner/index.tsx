import React from "react"

import { Box, SvgIcon, Typography } from "@mui/material"
import { TokenAmount } from "@wildcatfi/wildcat-sdk"

import Change from "@/assets/icons/change_icon.svg"
import { TooltipButton } from "@/components/TooltipButton"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { useAppSelector } from "@/store/hooks"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas } from "@/utils/formatters"

export type WrapperExchangeBannerProps = {
  marketBalance?: TokenAmount
  shareBalance?: TokenAmount
  marketSymbol?: string
  shareSymbol?: string
}

export const WrapperExchangeBanner = ({
  marketBalance,
  shareBalance,
  marketSymbol,
  shareSymbol,
}: WrapperExchangeBannerProps = {}) => {
  const isMobile = useMobileResolution()
  const isMobileOpenState = useAppSelector(
    (state) => state.wrapDebtTokenFlow.isMobileOpenedState,
  )

  const marketValue = marketBalance ? formatTokenWithCommas(marketBalance) : "0"
  const shareValue = shareBalance ? formatTokenWithCommas(shareBalance) : "0"

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px",
        background: isMobileOpenState ? COLORS.hintOfRed : "transparent",
        borderRadius: "12px",
        // eslint-disable-next-line no-nested-ternary
        marginBottom: isMobile ? (isMobileOpenState ? "20px" : "12px") : "24px",
        marginX: isMobile && isMobileOpenState ? "16px" : 0,
      }}
    >
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Typography
            variant={isMobile ? "mobText3" : "text3"}
            color={COLORS.manate}
          >
            Market tokens
          </Typography>
          <TooltipButton
            value="Balance of market (debt) tokens in your wallet."
            color={COLORS.manate}
          />
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "start-end",
            gap: "3px",
          }}
        >
          <Typography variant={isMobile ? "mobText1" : "title2"}>
            {marketValue}
          </Typography>
          <Typography
            variant={isMobile ? "mobText4" : "text4"}
            color={COLORS.manate}
            sx={{ marginTop: "4px" }}
          >
            {marketSymbol || ""}
          </Typography>
        </Box>
      </Box>

      <SvgIcon
        sx={{ fontSize: "20px", "& path": { fill: COLORS.matteSilver } }}
      >
        <Change />
      </SvgIcon>

      <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Typography
            variant={isMobile ? "mobText3" : "text3"}
            color={COLORS.manate}
          >
            Wrapped tokens
          </Typography>
          <TooltipButton
            value="Balance of wrapped (ERC-4626 share) tokens in your wallet."
            color={COLORS.manate}
          />
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "flex-end",
            gap: "3px",
          }}
        >
          <Typography variant={isMobile ? "mobText1" : "title2"}>
            {shareValue}
          </Typography>
          <Typography
            variant={isMobile ? "mobText4" : "text4"}
            color={COLORS.manate}
            sx={{ marginTop: "4px" }}
          >
            {shareSymbol || ""}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
