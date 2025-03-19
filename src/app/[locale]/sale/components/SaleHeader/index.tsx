"use client"

import { Box, Button, Divider } from "@mui/material"
import Link from "next/link"

import Logo from "@/assets/icons/sale_logo_black.svg"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"

import { SaleProfileButton } from "../SaleProfileButton"

const HeaderStyles = {
  width: "100vw",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 16px 12px 4px",
  borderBottom: `1px solid ${COLORS.athensGrey}`,
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
  height: "100%",
  margin: "0 16px",
}

export const SaleHeader = () => (
  <Box sx={HeaderStyles}>
    <Link href={ROUTES.sale} style={{ height: "32px" }}>
      <Logo />
    </Link>

    <Box sx={ButtonContainerStyles}>
      <Box sx={LinksContainerStyles}>
        <Link href={ROUTES.lender.root}>
          <Button
            variant="outlined"
            color="secondary"
            size="small"
            sx={OutlinedButtonStyles}
          >
            App
          </Button>
        </Link>

        <Link
          href="https://docs.wildcat.finance/"
          style={{ display: "flex", textDecoration: "none" }}
        >
          <Button size="small" sx={TextButtonStyles}>
            Docs
          </Button>
        </Link>

        <Link
          href="https://x.com/functi0nZer0"
          style={{ display: "flex", textDecoration: "none" }}
        >
          <Button size="small" sx={TextButtonStyles}>
            Help
          </Button>
        </Link>
      </Box>

      <Divider
        orientation="vertical"
        variant="middle"
        flexItem
        sx={DividerStyles}
      />

      <SaleProfileButton />
    </Box>
  </Box>
)
