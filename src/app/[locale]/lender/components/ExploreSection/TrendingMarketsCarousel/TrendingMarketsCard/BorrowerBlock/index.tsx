import * as React from "react"

import { Box, SvgIcon, Typography } from "@mui/material"

import Avatar from "@/assets/icons/avatar_icon.svg"
import { MarketStatusAndTermChip } from "@/components/@extended/MarketStatusAndTermChip"
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
      gap: { xs: "14px", md: "9px" },
      paddingTop: { xs: "16px", md: "10px" },
    }}
  >
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: { xs: "3px", md: "2px" },
        minWidth: 0,
      }}
    >
      <Typography
        sx={{
          display: "block",
          overflow: "hidden",
          fontSize: { xs: "16px", md: "11px" },
          fontWeight: 600,
          lineHeight: { xs: "22px", md: "16px" },
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
          gap: { xs: "8px", md: "5px" },
        }}
      >
        {borrower.startsWith("0") ? (
          <SvgIcon
            sx={{
              width: { xs: "20px", md: "14px" },
              height: { xs: "20px", md: "14px" },
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
              width: { xs: "20px", md: "14px" },
              height: { xs: "20px", md: "14px" },
              flex: "0 0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              backgroundColor: COLORS.hawkesBlue,
              color: COLORS.blueRibbon,
              fontSize: { xs: "10px", md: "7px" },
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
            fontSize: { xs: "16px", md: "11px" },
            lineHeight: { xs: "22px", md: "16px" },
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {borrower}
        </Typography>
      </Box>
    </Box>

    <Box sx={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: { xs: "2px", md: "1px" },
        }}
      >
        <Typography
          sx={{
            fontSize: { xs: "30px", md: "18px" },
            fontWeight: 500,
            lineHeight: 1,
          }}
        >
          {formatBps(apr)}%
        </Typography>
        <Typography
          sx={{
            color: COLORS.matteSilver,
            fontSize: { xs: "10px", md: "8px" },
            fontWeight: 600,
            lineHeight: { xs: "14px", md: "12px" },
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
          gap: { xs: "2px", md: "1px" },
          minWidth: 0,
          textAlign: "right",
        }}
      >
        <Typography
          sx={{
            fontSize: { xs: "16px", md: "12px" },
            fontWeight: 600,
            lineHeight: 1,
          }}
        >
          {supplied}
        </Typography>
        <Typography
          sx={{
            color: COLORS.matteSilver,
            fontSize: { xs: "14px", md: "9px" },
            lineHeight: { xs: "18px", md: "13px" },
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
        gap: { xs: "10px", md: "6px" },
        marginTop: { xs: "4px", md: "3px" },
      }}
    >
      <MarketStatusAndTermChip status={status} termLabel={termLabel} />

      <Typography
        sx={{
          color: COLORS.matteSilver,
          fontSize: { xs: "14px", md: "9px" },
          lineHeight: { xs: "20px", md: "14px" },
          textAlign: "right",
          whiteSpace: "nowrap",
        }}
      >
        {termDetail}
      </Typography>
    </Box>
  </Box>
)
