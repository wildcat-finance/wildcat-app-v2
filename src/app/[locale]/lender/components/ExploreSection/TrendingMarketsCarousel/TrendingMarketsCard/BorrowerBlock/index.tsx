import * as React from "react"

import { Box, Typography } from "@mui/material"
import { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

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
      variant="mobText3"
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
  const { t } = useTranslation()

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
          variant="mobText1"
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
            href={`${ROUTES.lender.profile}/${borrowerAddress}`}
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
        variant="mobText3"
        sx={{
          color: COLORS.matteSilver,
          fontSize: { xs: "13px", md: "10px" },
          lineHeight: { xs: "18px", md: "14px" },
        }}
      >
        {t("marketList.shared.cards.supplied", {
          supplied,
          asset,
          capacity,
        })}
      </Typography>
    </Box>
  )
}
