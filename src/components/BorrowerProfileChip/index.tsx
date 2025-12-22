import * as React from "react"

import { Box, SvgIcon, Typography } from "@mui/material"

import Avatar from "@/assets/icons/avatar_icon.svg"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"

export const BorrowerProfileChip = ({
  borrower,
}: {
  borrower: string | undefined
}) => {
  const isMobile = useMobileResolution()

  return (
    <Box
      sx={{
        width: "fit-content",
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

      <Typography
        variant={isMobile ? "mobText4" : "text4"}
        sx={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {borrower}
      </Typography>
    </Box>
  )
}
