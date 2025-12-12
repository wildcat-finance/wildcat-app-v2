import * as React from "react"

import { Box, SvgIcon, Typography } from "@mui/material"

import Avatar from "@/assets/icons/avatar_icon.svg"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"

export const BorrowerProfileChip = ({ borrower }: { borrower: string }) => {
  const isMobile = useMobileResolution()

  return (
    <Box
      sx={{
        display: "flex",
        gap: "6px",
        alignItems: "center",
        padding: "2px 8px 2px 6px",
        borderRadius: "12px",
        bgcolor: COLORS.whiteSmoke,
        marginTop: "2px",
      }}
    >
      {borrower && borrower.startsWith("0") ? (
        <SvgIcon
          sx={{
            fontSize: "12px",
            "& circle": { fill: "#4CA6D9", opacity: 1 },
            "& path": { fill: COLORS.white },
          }}
        >
          <Avatar />
        </SvgIcon>
      ) : (
        <Box
          sx={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            bgcolor: "#4CA6D9",

            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography
            variant="mobText4"
            sx={{
              fontSize: "6px",
              lineHeight: "6px",
              color: COLORS.white,
            }}
          >
            {borrower && borrower[0]}
          </Typography>
        </Box>
      )}

      <Typography variant={isMobile ? "mobText4" : "text4"}>
        {borrower}
      </Typography>
    </Box>
  )
}
