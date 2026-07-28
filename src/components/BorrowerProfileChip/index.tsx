import * as React from "react"

import { Box, SvgIcon, Typography } from "@mui/material"

import Avatar from "@/assets/icons/avatar_icon.svg"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"

export const BorrowerProfileChip = ({
  borrower,
  size = "default",
}: {
  borrower: string | undefined
  size?: "default" | "large"
}) => {
  const isMobile = useMobileResolution()
  const isLarge = size === "large"

  return (
    <Box
      sx={{
        width: "fit-content",
        minWidth: 0,
        display: "flex",
        gap: isLarge ? "8px" : "6px",
        alignItems: "center",
        padding: isLarge ? "4px 10px 4px 6px" : "2px 8px 2px 6px",
        borderRadius: isLarge ? "14px" : "12px",
        bgcolor: COLORS.whiteSmoke,
      }}
    >
      {borrower && borrower.startsWith("0") ? (
        <SvgIcon
          sx={{
            fontSize: isLarge ? "18px" : "12px",
            "& circle": { fill: "#4CA6D9", opacity: 1 },
            "& path": { fill: COLORS.white },
          }}
        >
          <Avatar />
        </SvgIcon>
      ) : (
        <Box
          sx={{
            width: isLarge ? "18px" : "12px",
            height: isLarge ? "18px" : "12px",
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
              fontSize: isLarge ? "9px" : "6px",
              lineHeight: isLarge ? "12px" : "8px",
              color: COLORS.white,
              textAlign: "center",
            }}
          >
            {borrower?.trim()?.[0]}
          </Typography>
        </Box>
      )}

      <Typography
        variant={isMobile ? "mobText4" : "text4"}
        sx={{
          minWidth: 0,
          overflow: "hidden",
          fontSize: isLarge ? "16px" : undefined,
          lineHeight: isLarge ? "22px" : undefined,
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {borrower}
      </Typography>
    </Box>
  )
}
