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
      gap: { xs: "2px", md: "4px" },
      padding: { xs: "0 6px 0 4px", md: "2px 7px 2px 5px" },
      borderRadius: { xs: "20px", md: "10px" },
      backgroundColor: { xs: COLORS.blackHaze, md: COLORS.whiteSmoke },
    }}
  >
    {chainId && (
      <NetworkIcon
        chainId={chainId as SupportedChainId}
        width={isMobile ? 10 : 11}
        height={isMobile ? 10 : 11}
      />
    )}
    <Typography
      variant="mobText3"
      sx={{
        fontSize: { xs: "11px", md: "10px" },
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
        gap: { xs: "5px", md: "8px" },
        margin: { xs: "0 3px", md: 0 },
        padding: { xs: "14px 3px 8px", md: "16px 0 18px" },
        borderTop: { xs: `1px solid ${COLORS.iron}`, md: "none" },
      }}
    >
      <MarketStatusAndTermChip
        status={status}
        termLabel={termLabel}
        size={isMobile ? "small" : "default"}
      />

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: { xs: "6px", md: "8px" },
          marginTop: { xs: "5px", md: "3px" },
        }}
      >
        <Typography
          variant="mobText1"
          sx={{
            overflow: "hidden",
            fontSize: { xs: "14px", md: "13px" },
            fontWeight: 600,
            lineHeight: { xs: "20px", md: "18px" },
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {marketName}
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexWrap: { xs: "wrap", md: "nowrap" },
            alignItems: "center",
            gap: { xs: "2px", md: "4px" },
          }}
        >
          <BorrowerProfileChip
            borrower={borrower}
            size={isMobile ? "tiny" : "small"}
            href={`${ROUTES.lender.profile}/${borrowerAddress}`}
          />
          <AssetChip asset={asset} chainId={chainId} isMobile={isMobile} />
        </Box>
      </Box>

      <Box
        sx={{
          ...SupplyProgressTrackStyle,
          width: { xs: "auto", md: "100%" },
          margin: { xs: "11px 2px 0", md: "8px 0 0" },
        }}
      >
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
          color: { xs: COLORS.manate, md: COLORS.matteSilver },
          fontSize: { xs: "11px", md: "10px" },
          lineHeight: { xs: "16px", md: "14px" },
        }}
      >
        {supplied} {asset} / {capacity} {asset} supplied
      </Typography>
    </Box>
  )
}
