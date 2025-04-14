"use client"

import { Box, Button, Divider } from "@mui/material"
import Link from "next/link"

import LogoWhite from "@/assets/icons/logo_new_white.svg"
import LogoBlack from "@/assets/icons/sale_logo_black.svg"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"

import { SideAppProfileButton } from "../SideAppProfileButton"

const HeaderStyles = {
  width: "100vw",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 16px 12px 4px",
}

const ButtonContainerStyles = {
  display: "flex",
  alignItems: "center",
}

const LinksContainerStyles = {
  display: "flex",
  gap: "20px",
}

const OutlinedButtonStyles = {
  padding: "6px 12px",
  minWidth: "fit-content",
}

const TextButtonStyles = {
  padding: 0,
  minWidth: "fit-content",
  "&:hover": {
    background: "transparent",
    boxShadow: "none",
  },
}

const DividerStyles = {
  height: "28px",
  margin: "0 16px",
}

export type SideAppHeaderProps = {
  theme?: "light" | "dark"
}

export const SideAppHeader = ({ theme = "light" }: SideAppHeaderProps) => {
  const isLightTheme = theme === "light"

  return (
    <Box
      sx={{
        ...HeaderStyles,
        borderBottom: isLightTheme ? `1px solid ${COLORS.athensGrey}` : "none",
      }}
    >
      <Link href={ROUTES.sale} style={{ height: "32px" }}>
        {isLightTheme ? <LogoBlack /> : <LogoWhite />}
      </Link>

      <Box sx={ButtonContainerStyles}>
        <Box sx={LinksContainerStyles}>
          <Link href={ROUTES.lender.root}>
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              sx={{
                ...OutlinedButtonStyles,
                color: isLightTheme ? COLORS.bunker : COLORS.white,
                borderColor: isLightTheme
                  ? COLORS.whiteLilac
                  : COLORS.athensGrey01,
                "&:hover": {
                  borderColor: isLightTheme
                    ? COLORS.whiteLilac
                    : COLORS.athensGrey01,
                  background: isLightTheme
                    ? COLORS.blackRock03
                    : COLORS.white01,
                  boxShadow: "none",
                },
              }}
            >
              App
            </Button>
          </Link>

          <Link
            href="https://docs.wildcat.finance/"
            style={{ display: "flex", textDecoration: "none" }}
          >
            <Button
              size="small"
              sx={{
                ...TextButtonStyles,
                color: isLightTheme ? COLORS.bunker : COLORS.white,
                "&:hover": {
                  color: isLightTheme ? COLORS.blackRock08 : COLORS.white06,
                  backgroundColor: "transparent",
                },
              }}
            >
              Docs
            </Button>
          </Link>

          <Link
            href="https://x.com/functi0nZer0"
            style={{ display: "flex", textDecoration: "none" }}
          >
            <Button
              size="small"
              sx={{
                ...TextButtonStyles,
                color: isLightTheme ? COLORS.bunker : COLORS.white,
                "&:hover": {
                  color: isLightTheme ? COLORS.blackRock08 : COLORS.white06,
                  backgroundColor: "transparent",
                },
              }}
            >
              Help
            </Button>
          </Link>
        </Box>

        <Divider
          orientation="vertical"
          variant="middle"
          flexItem
          sx={{
            ...DividerStyles,
            borderColor: isLightTheme ? COLORS.athensGrey : COLORS.athensGrey01,
          }}
        />

        <SideAppProfileButton theme={theme} />
      </Box>
    </Box>
  )
}
