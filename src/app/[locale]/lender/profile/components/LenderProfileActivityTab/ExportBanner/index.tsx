"use client"

import { useState } from "react"

import { Box, Button, SvgIcon, Typography } from "@mui/material"

import { LenderPositionRow } from "@/app/[locale]/lender/profile/hooks/types"
import Arrow from "@/assets/icons/arrowLeft_icon.svg"
import Paper from "@/assets/icons/paper_icon.svg"
import { COLORS } from "@/theme/colors"

import { ExportLenderCsvModal } from "../ExportLenderCsvModal"

type ExportBannerProps = {
  lenderAddress?: `0x${string}`
  positions: LenderPositionRow[]
}

// CSV export banner — both buttons open the export modal (period / market
// filters + download).
export const ExportBanner = ({
  lenderAddress,
  positions,
}: ExportBannerProps) => {
  const [exportOpen, setExportOpen] = useState(false)
  const canExport = !!lenderAddress && positions.length > 0

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        padding: "28px 24px",
        borderRadius: "12px",
        backgroundColor: COLORS.blackHaze,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          minWidth: 0,
        }}
      >
        <Typography variant="text1">Export</Typography>

        <Typography variant="text2" color={COLORS.manate}>
          Download transaction history with realized and unrealized interest
          breakdown
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexShrink: 0,
        }}
      >
        <Button
          variant="contained"
          size="small"
          sx={{ gap: "6px" }}
          disabled={!canExport}
          onClick={() => setExportOpen(true)}
        >
          <SvgIcon sx={{ fontSize: "16px" }}>
            <Paper />
          </SvgIcon>
          Tax-ready export
        </Button>

        <Button
          variant="outlined"
          color="secondary"
          size="small"
          sx={{ gap: "2px", paddingLeft: "9px" }}
          disabled={!canExport}
          onClick={() => setExportOpen(true)}
        >
          <SvgIcon
            sx={{
              transform: "rotate(-90deg)",
              fontSize: "14px",
            }}
          >
            <Arrow />
          </SvgIcon>
          CSV
        </Button>
      </Box>

      {lenderAddress && (
        <ExportLenderCsvModal
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          lenderAddress={lenderAddress}
          positions={positions}
        />
      )}
    </Box>
  )
}
