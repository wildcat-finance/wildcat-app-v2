import * as React from "react"

import { Box, Typography } from "@mui/material"
import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import { MarketStatusAndTermChip } from "@/components/@extended/MarketStatusAndTermChip"
import { BorrowerProfileChip } from "@/components/BorrowerProfileChip"
import { NetworkIcon } from "@/components/NetworkIcon"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { getMarketStatusChip } from "@/utils/marketStatus"

import { SupplyProgressFillStyle, SupplyProgressTrackStyle } from "../style"

export type TrendingMarketDetailsProps = {
  marketName: string
  borrower: string
  borrowerAddress: string
  asset: string
  chainId?: number
  suppliedPct: number
  supplied: string
  capacity: string
  status: ReturnType<typeof getMarketStatusChip>
  termLabel: string
  isMobile: boolean
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
      gap: { xs: "4px", md: "2px" },
      padding: { xs: "2px 7px", md: "0 6px 0 4px" },
      borderRadius: { xs: "12px", md: "20px" },
      backgroundColor: { xs: COLORS.whiteSmoke, md: COLORS.blackHaze },
    }}
  >
    {chainId && (
      <NetworkIcon
        chainId={chainId as SupportedChainId}
        width={isMobile ? 12 : 10}
        height={isMobile ? 12 : 10}
      />
    )}
    <Typography
      variant="mobText3"
      sx={{
        fontSize: { xs: "12px", md: "11px" },
        lineHeight: { xs: "16px", md: "16px" },
      }}
    >
      {asset}
    </Typography>
  </Box>
)

export const TrendingMarketDetails = ({
  marketName,
  borrower,
  borrowerAddress,
  asset,
  chainId,
  suppliedPct,
  supplied,
  capacity,
  status,
  termLabel,
  isMobile,
  // Keeping an explicit block avoids re-indenting this large JSX tree.
  // eslint-disable-next-line arrow-body-style
}: TrendingMarketDetailsProps) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: { xs: "12px", md: 0 },
        margin: { md: "0 3px" },
        padding: { xs: "14px 0 16px", md: "13px 3px 9px" },
        borderTop: { md: `1px solid ${COLORS.iron}` },
      }}
    >
      <MarketStatusAndTermChip status={status} termLabel={termLabel} />

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: { xs: "5px", md: "6px" },
          marginTop: { md: "10px" },
        }}
      >
        <Typography
          variant="mobText1"
          sx={{
            overflow: "hidden",
            color: { md: COLORS.blackRock },
            fontSize: { xs: "16px", md: "14px" },
            fontWeight: 600,
            lineHeight: { xs: "22px", md: "20px" },
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {marketName}
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: { xs: "4px", md: "2px" },
          }}
        >
          <BorrowerProfileChip
            borrower={borrower}
            size={isMobile ? "medium" : "small"}
            href={`${ROUTES.lender.profile}/${borrowerAddress}`}
          />
          <AssetChip asset={asset} chainId={chainId} isMobile={isMobile} />
        </Box>
      </Box>

      <Box sx={{ ...SupplyProgressTrackStyle, marginTop: { md: "16px" } }}>
        <Box
          sx={{
            ...SupplyProgressFillStyle,
            width: `${Math.min(100, Math.max(0, suppliedPct))}%`,
          }}
        />
      </Box>

      <Typography
        variant="mobText3"
        sx={{
          marginTop: { md: "5px" },
          color: { xs: COLORS.matteSilver, md: COLORS.manate },
          fontSize: { xs: "13px", md: "11px" },
          lineHeight: { xs: "18px", md: "16px" },
        }}
      >
        {supplied} {asset} / {capacity} {asset} supplied
      </Typography>
    </Box>
  )
}
