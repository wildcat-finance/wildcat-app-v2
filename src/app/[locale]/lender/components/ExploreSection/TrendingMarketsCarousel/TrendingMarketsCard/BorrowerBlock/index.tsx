import * as React from "react"

import { Box, SvgIcon, Typography } from "@mui/material"

import Avatar from "@/assets/icons/avatar_icon.svg"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"
import { formatBps } from "@/utils/formatters"

export type BorrоwerBlockProps = {
  borrower: string
  asset: string
  apr: number
  suppliedPct: number
  supplied: string
  capacity: string
}

export const BorrоwerBlock = ({
  borrower,
  asset,
  apr,
  suppliedPct,
  supplied,
  capacity,
}: BorrоwerBlockProps) => {
  const isMobile = useMobileResolution()

  return (
    <Box
      sx={{
        padding: "6px 6px 8px 6px",
        backgroundColor: COLORS.whiteSmoke,
        borderRadius: "12px",
      }}
    >
      <Box sx={{ display: "flex", gap: "6px" }}>
        {borrower && borrower.startsWith("0") ? (
          <SvgIcon
            sx={{
              marginTop: "2px",
              fontSize: "16px",
              "& circle": { fill: "#4CA6D9", opacity: 1 },
              "& path": { fill: COLORS.white },
            }}
          >
            <Avatar />
          </SvgIcon>
        ) : (
          <Box
            sx={{
              marginTop: "2px",
              width: "16px",
              height: "16px",
              borderRadius: "50%",
              bgcolor: "#4CA6D9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flex: "0 0 auto",
            }}
          >
            <Typography
              variant="mobText4"
              sx={{
                fontSize: "6px",
                lineHeight: "8px",
                color: COLORS.white,
                textAlign: "center",
              }}
            >
              {borrower?.trim()?.[0]}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          <Typography variant={isMobile ? "mobText3" : "text3"}>
            {borrower}
          </Typography>
          <Typography
            variant={isMobile ? "mobText3" : "text3"}
            sx={{ opacity: 0.8 }}
          >
            {asset} · {formatBps(apr)}% APR
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          padding: "12px 4px 0",
        }}
      >
        <Box
          sx={{
            width: "100%",
            height: "4px",
            borderRadius: "2px",
            backgroundColor: COLORS.iron,
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              ...{
                height: "100%",
                borderRadius: "inherit",
                backgroundColor: "#555988",
              },
              width: `${Math.min(100, Math.max(0, suppliedPct))}%`,
            }}
          />
        </Box>

        <Typography
          variant={isMobile ? "mobText3" : "text3"}
          sx={{ color: COLORS.manate }}
        >
          {supplied} / {capacity} supplied
        </Typography>
      </Box>
    </Box>
  )
}
