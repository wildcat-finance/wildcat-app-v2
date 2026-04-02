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
  convertedShareValue?: string
  convertedShareSymbol?: string
}

const BannerItem = ({
  isMobile,
  title,
  tooltip,
  value,
  symbol,
  align,
}: {
  isMobile: boolean
  title: string
  tooltip: string
  value: string
  symbol: string
  align: "start" | "end"
}) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      alignItems: `flex-${align}`,
    }}
  >
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: `flex-${align}`,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {align === "end" && (
          <TooltipButton value={tooltip} color={COLORS.manate} />
        )}
        <Typography
          variant={isMobile ? "mobText4" : "text4"}
          color={COLORS.manate}
        >
          {title}
        </Typography>
        {align === "start" && (
          <TooltipButton value={tooltip} color={COLORS.manate} />
        )}
      </Box>

      <Typography
        variant={isMobile ? "mobText4" : "text4"}
        color={COLORS.manate}
      >
        ({symbol || ""})
      </Typography>
    </Box>

    <Typography variant={isMobile ? "mobText1" : "title2"}>{value}</Typography>
  </Box>
)

export const WrapperExchangeBanner = ({
  marketBalance,
  shareBalance,
  marketSymbol,
  shareSymbol,
  convertedShareValue,
  convertedShareSymbol,
}: WrapperExchangeBannerProps = {}) => {
  const isMobile = useMobileResolution()
  const isMobileOpenState = useAppSelector(
    (state) => state.wrapDebtTokenFlow.isMobileOpenedState,
  )

  const marketValue = marketBalance ? formatTokenWithCommas(marketBalance) : "0"
  const shareValue = shareBalance ? formatTokenWithCommas(shareBalance) : "0"

  return (
    <>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          padding: "16px",
          background: isMobileOpenState ? COLORS.hintOfRed : "transparent",
          borderRadius: "12px",
          marginBottom: "12px",
          marginX: isMobile && isMobileOpenState ? "16px" : 0,
        }}
      >
        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <BannerItem
            title="Market tokens"
            tooltip="Balance of market (debt) tokens in your wallet."
            value={marketValue}
            symbol={marketSymbol || ""}
            align="start"
            isMobile={isMobile}
          />

          <SvgIcon
            sx={{ fontSize: "20px", "& path": { fill: COLORS.matteSilver } }}
          >
            <Change />
          </SvgIcon>

          <BannerItem
            title="Wrapped tokens"
            tooltip="Balance of wrapped (ERC-4626 share) tokens in your wallet."
            value={shareValue}
            symbol={shareSymbol || ""}
            align="end"
            isMobile={isMobile}
          />
        </Box>
      </Box>

      {convertedShareValue && convertedShareSymbol && isMobileOpenState && (
        <Typography
          variant={isMobile ? "mobText3" : "text3"}
          color={COLORS.manate}
          sx={{
            display: "block",
            width: "100%",
            textAlign: "right",
            paddingRight: "16px",
            // eslint-disable-next-line no-nested-ternary
            marginBottom: isMobile
              ? isMobileOpenState
                ? "20px"
                : "12px"
              : "24px",
          }}
        >
          Wrapped holdings value: ~ {convertedShareValue} {convertedShareSymbol}
        </Typography>
      )}
    </>
  )
}
