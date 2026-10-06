import * as React from "react"

import { Box, SvgIcon, Typography } from "@mui/material"
import { useRouter } from "next/navigation"

import Avatar from "@/assets/icons/avatar_icon.svg"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"

const CHIP_SIZE_STYLES = {
  small: {
    avatar: "12px",
    gap: "5px",
    padding: "2px 7px 2px 5px",
    radius: "10px",
    initialFont: "6px",
    initialLineHeight: "8px",
    fontSize: "10px",
    lineHeight: "14px",
  },
  default: {
    avatar: "12px",
    gap: "6px",
    padding: "2px 8px 2px 6px",
    radius: "12px",
    initialFont: "6px",
    initialLineHeight: "8px",
    fontSize: undefined,
    lineHeight: undefined,
  },
  medium: {
    avatar: "14px",
    gap: "6px",
    padding: "2px 8px 2px 6px",
    radius: "12px",
    initialFont: "7px",
    initialLineHeight: "9px",
    fontSize: "13px",
    lineHeight: "18px",
  },
  large: {
    avatar: "18px",
    gap: "8px",
    padding: "4px 10px 4px 6px",
    radius: "14px",
    initialFont: "9px",
    initialLineHeight: "12px",
    fontSize: "16px",
    lineHeight: "22px",
  },
} as const

export const BorrowerProfileChip = ({
  borrower,
  size = "default",
  href,
}: {
  borrower: string | undefined
  size?: "small" | "default" | "medium" | "large"
  href?: string
}) => {
  const isMobile = useMobileResolution()
  const router = useRouter()
  const sizeStyles = CHIP_SIZE_STYLES[size]

  return (
    <Box
      onClick={
        href
          ? (event: React.MouseEvent) => {
              event.preventDefault()
              event.stopPropagation()
              router.push(href)
            }
          : undefined
      }
      sx={{
        width: "fit-content",
        minWidth: 0,
        display: "flex",
        gap: sizeStyles.gap,
        alignItems: "center",
        padding: sizeStyles.padding,
        borderRadius: sizeStyles.radius,
        bgcolor: COLORS.whiteSmoke,
        ...(href && {
          cursor: "pointer",
          "&:hover": { bgcolor: COLORS.athensGrey },
        }),
      }}
    >
      {borrower && borrower.startsWith("0") ? (
        <SvgIcon
          sx={{
            fontSize: sizeStyles.avatar,
            "& circle": { fill: "#4CA6D9", opacity: 1 },
            "& path": { fill: COLORS.white },
          }}
        >
          <Avatar />
        </SvgIcon>
      ) : (
        <Box
          sx={{
            width: sizeStyles.avatar,
            height: sizeStyles.avatar,
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
              fontSize: sizeStyles.initialFont,
              lineHeight: sizeStyles.initialLineHeight,
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
          fontSize: sizeStyles.fontSize,
          lineHeight: sizeStyles.lineHeight,
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {borrower}
      </Typography>
    </Box>
  )
}
