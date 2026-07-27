import * as React from "react"

import { Box, Chip, SvgIcon, Typography } from "@mui/material"

import Avatar from "@/assets/icons/avatar_icon.svg"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { COLORS } from "@/theme/colors"
import { formatBps } from "@/utils/formatters"
import { getMarketStatusChip } from "@/utils/marketStatus"

import { SupplyProgressFillStyle, SupplyProgressTrackStyle } from "../style"

export type TrendingMarketDetailsProps = {
  marketName: string
  borrower: string
  apr: number
  suppliedPct: number
  supplied: string
  capacity: string
  status: ReturnType<typeof getMarketStatusChip>
  termLabel: string
  termDetail: string
}

export const TrendingMarketDetails = ({
  marketName,
  borrower,
  apr,
  suppliedPct,
  supplied,
  capacity,
  status,
  termLabel,
  termDetail,
}: TrendingMarketDetailsProps) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      gap: "9px",
      paddingTop: "10px",
    }}
  >
    <Box
      sx={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}
    >
      <Typography
        sx={{
          display: "block",
          overflow: "hidden",
          fontSize: "13px",
          fontWeight: 600,
          lineHeight: "18px",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {marketName}
      </Typography>

      <Box sx={{ display: "flex", alignItems: "center", gap: "5px" }}>
        {borrower.startsWith("0") ? (
          <SvgIcon
            sx={{
              width: "14px",
              height: "14px",
              flexShrink: 0,
              "& circle": { fill: COLORS.hawkesBlue, opacity: 1 },
              "& path": { fill: COLORS.blueRibbon },
            }}
          >
            <Avatar />
          </SvgIcon>
        ) : (
          <Box
            sx={{
              width: "14px",
              height: "14px",
              flex: "0 0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              backgroundColor: COLORS.hawkesBlue,
              color: COLORS.blueRibbon,
              fontSize: "7px",
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            {borrower.trim()[0]}
          </Box>
        )}

        <Typography
          sx={{
            overflow: "hidden",
            color: COLORS.blackRock,
            fontSize: "11px",
            lineHeight: "16px",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {borrower}
        </Typography>
      </Box>
    </Box>

    <Box sx={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: "1px" }}>
        <Typography sx={{ fontSize: "18px", fontWeight: 500, lineHeight: 1 }}>
          {formatBps(apr)}%
        </Typography>
        <Typography
          sx={{
            color: COLORS.matteSilver,
            fontSize: "8px",
            fontWeight: 600,
            lineHeight: "12px",
            textTransform: "uppercase",
          }}
        >
          Base APR
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "1px",
          minWidth: 0,
          textAlign: "right",
        }}
      >
        <Typography sx={{ fontSize: "12px", fontWeight: 600, lineHeight: 1 }}>
          {supplied}
        </Typography>
        <Typography
          sx={{
            color: COLORS.matteSilver,
            fontSize: "9px",
            lineHeight: "13px",
            whiteSpace: "nowrap",
          }}
        >
          deposited of {capacity} cap
        </Typography>
      </Box>
    </Box>

    <Box sx={SupplyProgressTrackStyle}>
      <Box
        sx={{
          ...SupplyProgressFillStyle,
          width: `${Math.min(100, Math.max(0, suppliedPct))}%`,
        }}
      />
    </Box>

    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "6px",
        marginTop: "3px",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <MarketStatusChip status={status} withPeriod={false} />
        <Chip
          label={termLabel}
          sx={{ backgroundColor: COLORS.whiteSmoke, color: COLORS.blackRock }}
        />
      </Box>

      <Typography
        sx={{
          color: COLORS.matteSilver,
          fontSize: "9px",
          lineHeight: "14px",
          textAlign: "right",
          whiteSpace: "nowrap",
        }}
      >
        {termDetail}
      </Typography>
    </Box>
  </Box>
)
