import * as React from "react"

import { Box, SvgIcon, Typography } from "@mui/material"

import Ethereal from "@/assets/companies-icons/ethereal-white_icon.svg"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"

export const AurosEthenaBanner = ({ maxWidth }: { maxWidth?: string }) => {
  const isMobile = useMobileResolution()

  return (
    <Box
      sx={{
        maxWidth: maxWidth ?? "294px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        padding: "10px",
        borderRadius: "8px",
        background:
          "radial-gradient(74.21% 105.42% at 50.11% 14.6%, rgba(58, 58, 58, 0.70) 3.13%, rgba(28, 28, 28, 0.70) 100%), #111",
      }}
    >
      <Box
        sx={{
          width: "100%",
          display: "flex",
          gap: "6px",
        }}
      >
        <Typography
          variant={isMobile ? "mobText3" : "text3"}
          fontWeight={600}
          color={COLORS.white}
        >
          1 million weekly of
        </Typography>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "#383737",
            padding: "2px 8px 2px 3px",
            borderRadius: "20px",
          }}
        >
          <SvgIcon>
            <Ethereal />
          </SvgIcon>

          <Typography
            variant={isMobile ? "mobText4" : "text4"}
            color={COLORS.white}
          >
            Ethereal Points
          </Typography>
        </Box>
      </Box>

      <Typography
        variant={isMobile ? "mobText3" : "text3"}
        color={COLORS.white}
        sx={{ opacity: 0.8 }}
      >
        Receive pro-rate share of 1 million Ethereal points
      </Typography>
    </Box>
  )
}
