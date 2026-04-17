"use client"

import { Box, Typography } from "@mui/material"
import Link from "next/link"

import { COLORS } from "@/theme/colors"
import { buildMarketHref, formatBps } from "@/utils/formatters"

type TrendingMarketCardLendersProps = {
  marketAddress: string
  chainId?: number
  borrowerName: string
  asset: string
  apr: number
  lenderCount?: number
}

export const TrendingMarketCardLenders = ({
  marketAddress,
  chainId,
  borrowerName,
  asset,
  apr,
  lenderCount,
}: TrendingMarketCardLendersProps) => (
  <Box
    component={Link}
    href={buildMarketHref(marketAddress, chainId)}
    sx={{
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      alignItems: "center",
      padding: "20px 12px 12px",
      borderRadius: "12px",
      border: `1px solid ${COLORS.whiteLilac}`,
      textDecoration: "none",
      width: "100%",
    }}
  >
    <Box
      sx={{
        display: "flex",
        gap: "6px",
        alignItems: "center",
        flexShrink: 0,
      }}
    >
      <Typography
        variant="text1"
        sx={{ color: COLORS.blackRock, whiteSpace: "nowrap" }}
      >
        {borrowerName}
      </Typography>
      <Box
        sx={{
          backgroundColor: COLORS.blackHaze,
          borderRadius: "20px",
          paddingX: "6px",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          flexShrink: 0,
        }}
      >
        <Typography
          variant="text3"
          sx={{ color: COLORS.blackRock, whiteSpace: "nowrap" }}
        >
          {asset}
        </Typography>
      </Box>
    </Box>

    <Box
      sx={{
        display: "flex",
        gap: "4px",
        alignItems: "center",
        justifyContent: "center",
        flexWrap: "wrap",
        paddingTop: "4px",
        paddingBottom: "16px",
        flexShrink: 0,
      }}
    >
      <Typography
        variant="text3"
        sx={{ color: COLORS.blackRock, opacity: 0.8, whiteSpace: "nowrap" }}
      >
        Earn
      </Typography>
      <Typography
        variant="text3"
        sx={{ color: "#28CA7C", whiteSpace: "nowrap" }}
      >
        {formatBps(apr)} APY
      </Typography>
      <Typography
        variant="text3"
        sx={{ color: COLORS.blackRock, opacity: 0.8, whiteSpace: "nowrap" }}
      >
        ·
      </Typography>
      <Typography
        variant="text3"
        sx={{ color: COLORS.blackRock, opacity: 0.8, whiteSpace: "nowrap" }}
      >
        Trusted by
      </Typography>
      <Box
        sx={{
          backgroundColor: COLORS.glitter,
          borderRadius: "12px",
          paddingX: "6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Typography
          variant="text3"
          sx={{ color: COLORS.ultramarineBlue, whiteSpace: "nowrap" }}
        >
          {lenderCount?.toLocaleString() ?? "—"}
        </Typography>
      </Box>
      <Typography
        variant="text3"
        sx={{ color: COLORS.blackRock, opacity: 0.8, whiteSpace: "nowrap" }}
      >
        lenders
      </Typography>
    </Box>

    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: COLORS.bunker,
        borderRadius: "8px",
        padding: "6px 12px",
        width: "100%",
        height: "32px",
        flexShrink: 0,
      }}
    >
      <Box
        sx={{
          display: "flex",
          gap: "2px",
          alignItems: "flex-start",
          flex: "1 0 0",
          whiteSpace: "nowrap",
        }}
      >
        <Typography variant="text4Highlighted" sx={{ color: COLORS.white }}>
          Earn
        </Typography>
        <Typography variant="text4Highlighted" sx={{ color: COLORS.white }}>
          {formatBps(apr)} APY
        </Typography>
      </Box>
      <Typography
        variant="text4Highlighted"
        sx={{ color: COLORS.white, opacity: 0.2, flexShrink: 0 }}
      >
        |
      </Typography>
      <Typography
        variant="text4Highlighted"
        sx={{
          color: COLORS.white,
          flex: "1 0 0",
          textAlign: "right",
          whiteSpace: "nowrap",
        }}
      >
        Deposit
      </Typography>
    </Box>
  </Box>
)
