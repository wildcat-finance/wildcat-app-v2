import * as React from "react"

import { Box, Typography } from "@mui/material"
import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import { MarketStatusAndTermChip } from "@/components/@extended/MarketStatusAndTermChip"
import { BorrowerProfileChip } from "@/components/BorrowerProfileChip"
import { NetworkIcon } from "@/components/NetworkIcon"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"
import { getMarketStatusChip } from "@/utils/marketStatus"

import { SupplyProgressFillStyle, SupplyProgressTrackStyle } from "../style"

export type TrendingMarketDetailsProps = {
  marketName: string
  borrower: string
  asset: string
  chainId?: number
  suppliedPct: number
  supplied: string
  capacity: string
  status: ReturnType<typeof getMarketStatusChip>
  termLabel: string
}

const AssetChip = ({
  asset,
  chainId,
  isMobile,
}: {
  asset: string
  chainId?: number
  isMobile: boolean
}) => (
  <Box
    sx={{
      width: "fit-content",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      padding: { xs: "2px 7px", md: "2px 7px 2px 5px" },
      borderRadius: { xs: "12px", md: "10px" },
      backgroundColor: COLORS.whiteSmoke,
    }}
  >
    {chainId && (
      <NetworkIcon
        chainId={chainId as SupportedChainId}
        width={isMobile ? 12 : 11}
        height={isMobile ? 12 : 11}
      />
    )}
    <Typography
      sx={{
        fontSize: { xs: "12px", md: "10px" },
        lineHeight: { xs: "16px", md: "14px" },
      }}
    >
      {asset}
    </Typography>
  </Box>
)

export const TrendingMarketDetails = ({
  marketName,
  borrower,
  asset,
  chainId,
  suppliedPct,
  supplied,
  capacity,
  status,
  termLabel,
}: TrendingMarketDetailsProps) => {
  const isMobile = useMobileResolution()

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: { xs: "12px", md: "8px" },
        padding: { xs: "14px 0 16px", md: "16px 0 18px" },
      }}
    >
      <MarketStatusAndTermChip status={status} termLabel={termLabel} />

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: { xs: "5px", md: "8px" },
          marginTop: { md: "3px" },
        }}
      >
        <Typography
          sx={{
            overflow: "hidden",
            fontSize: { xs: "16px", md: "13px" },
            fontWeight: 600,
            lineHeight: { xs: "22px", md: "18px" },
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {marketName}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <BorrowerProfileChip
            borrower={borrower}
            size={isMobile ? "medium" : "small"}
          />
          <AssetChip asset={asset} chainId={chainId} isMobile={isMobile} />
        </Box>
      </Box>

      <Box sx={{ ...SupplyProgressTrackStyle, marginTop: { md: "8px" } }}>
        <Box
          sx={{
            ...SupplyProgressFillStyle,
            width: `${Math.min(100, Math.max(0, suppliedPct))}%`,
          }}
        />
      </Box>

      <Typography
        sx={{
          color: COLORS.matteSilver,
          fontSize: { xs: "13px", md: "10px" },
          lineHeight: { xs: "18px", md: "14px" },
        }}
      >
        {supplied} {asset} / {capacity} {asset} supplied
      </Typography>
    </Box>
  )
}
