import * as React from "react"

import { Box, Chip, Divider, SvgIcon, Typography } from "@mui/material"

import { SaleChip } from "@/app/[locale]/sale/components/SaleChip"
import { SaleTokenModal } from "@/app/[locale]/sale/components/SaleTokenModal"
import Clock from "@/assets/icons/clock_icon.svg"
import { COLORS } from "@/theme/colors"

export type SaleSidebarProps = {
  tokenName: string
  tokenSymbol: string
  raised: string
  sold: string
  saleEnd: string
}

export const SaleSidebar = ({
  tokenName,
  tokenSymbol,
  raised,
  sold,
  saleEnd,
}: SaleSidebarProps) => (
  <Box
    sx={{
      height: "100%",
      maxWidth: "378px",
      display: "flex",
      flexDirection: "column",
      padding: "32px 31px 0 28px",
      borderRight: `1px solid ${COLORS.athensGrey}`,
    }}
  >
    <Box>
      <Typography variant="text3" color={COLORS.santasGrey}>
        Token
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", marginTop: "10px" }}>
        <Box
          sx={{
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            backgroundColor: COLORS.athensGrey,
            marginRight: "10px",
          }}
        />

        <Typography
          variant="title2"
          sx={{ textTransform: "uppercase", marginRight: "12px" }}
        >
          {tokenName}
        </Typography>

        <SaleChip
          value={tokenSymbol}
          color={COLORS.glitter}
          textColor={COLORS.blueRibbon}
        />
      </Box>
    </Box>

    <Box
      sx={{
        marginTop: "20px",

        display: "flex",
        padding: "16px",
        borderRadius: "12px",
        backgroundColor: COLORS.hintOfRed,
      }}
    >
      <Box
        sx={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        <Typography variant="text3" color={COLORS.santasGrey}>
          Funds Raised
        </Typography>
        <Typography variant="text1">{raised}</Typography>
      </Box>

      <Divider
        orientation="vertical"
        variant="middle"
        flexItem
        sx={{ height: "100%", margin: "0 16px" }}
      />

      <Box
        sx={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        <Typography variant="text3" color={COLORS.santasGrey}>
          Sold
        </Typography>
        <Typography variant="text1">{sold}</Typography>
      </Box>
    </Box>

    <Divider sx={{ width: "100%", margin: "24px 0 12px" }} />

    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 16px",
        marginBottom: "10px",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <SvgIcon
          sx={{
            marginRight: "6px",
            "& path": { fill: `${COLORS.santasGrey}` },
          }}
        >
          <Clock />
        </SvgIcon>
        <Typography variant="text3" color={COLORS.santasGrey}>
          Sales ends in
        </Typography>
      </Box>

      <Typography variant="text1">{saleEnd}</Typography>
    </Box>

    <SaleTokenModal tokenName={tokenSymbol} impact="3.784%" />
  </Box>
)
