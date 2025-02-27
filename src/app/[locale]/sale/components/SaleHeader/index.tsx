import { Box, Button, Divider, SvgIcon } from "@mui/material"
import Link from "next/link"

import Logo from "@/assets/icons/sale_logo_black.svg"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"

import { SaleProfileButton } from "../SaleProfileButton"

export const SaleHeader = () => {
  const a = ""

  return (
    <Box
      sx={{
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 16px 12px 4px",
        borderBottom: `1px solid ${COLORS.athensGrey}`,
      }}
    >
      <Link href={ROUTES.sale} style={{ height: "32px" }}>
        <Logo />
      </Link>

      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Box sx={{ display: "flex", gap: "20px" }}>
          <Link href={ROUTES.lender.root}>
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              sx={{
                padding: "6px 12px",
                minWidth: "fit-content",
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
                padding: 0,
                minWidth: "fit-content",
                "&:hover": {
                  background: "transparent",
                  boxShadow: "none",
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
                padding: 0,
                minWidth: "fit-content",
                "&:hover": {
                  background: "transparent",
                  boxShadow: "none",
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
          sx={{ height: "100%", margin: "0 16px" }}
        />

        <SaleProfileButton />
      </Box>
    </Box>
  )
}
