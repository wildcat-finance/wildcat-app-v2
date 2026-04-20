"use client"

import { Box, SvgIcon, Typography } from "@mui/material"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAccount } from "wagmi"

import AllMarketsIcon from "@/assets/icons/allMarkets_icon.svg"
import ExploreIcon from "@/assets/icons/oneOfMany_icon.svg"
import MyMarketsIcon from "@/assets/icons/stack_icon.svg"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"

const TABS = [
  { label: "Explore", href: ROUTES.lender.explore, icon: ExploreIcon },
  { label: "My Markets", href: ROUTES.lender.myMarkets, icon: MyMarketsIcon },
  {
    label: "All Markets",
    href: ROUTES.lender.allMarkets,
    icon: AllMarketsIcon,
  },
]

const OVERVIEW_ROUTES = [
  ROUTES.lender.explore,
  ROUTES.lender.myMarkets,
  ROUTES.lender.allMarkets,
]

export const LenderMobileFooterMenu = () => {
  const pathname = usePathname()
  const isMobile = useMobileResolution()
  const { isConnected } = useAccount()

  const isOverviewPage = OVERVIEW_ROUTES.some(
    (route) => pathname?.endsWith(route),
  )

  if (!isMobile || !isOverviewPage) return null

  return (
    <Box
      sx={{
        position: "sticky",
        bottom: "4px",
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        backgroundColor: COLORS.white,
        border: `1px solid ${COLORS.whiteLilac}`,
        borderRadius: "14px",
        padding: "12px",
        gap: "4px",
        marginTop: "8px",
      }}
    >
      {TABS.filter(({ label }) => label !== "My Markets" || isConnected).map(
        ({ label, href, icon: Icon }) => {
          const isActive = pathname?.endsWith(href) ?? false

          return (
            <Box
              key={href}
              component={Link}
              href={href}
              sx={{
                flex: "1 0 0",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
                textDecoration: "none",
              }}
            >
              <SvgIcon
                sx={{
                  fontSize: "16px",
                  "& path": {
                    fill: isActive ? COLORS.ultramarineBlue : COLORS.blackRock,
                  },
                }}
              >
                <Icon />
              </SvgIcon>
              <Typography
                variant="mobText4"
                sx={{
                  color: isActive ? COLORS.ultramarineBlue : COLORS.blackRock,
                  lineHeight: "16px",
                  fontWeight: 500,
                }}
              >
                {label}
              </Typography>
            </Box>
          )
        },
      )}
    </Box>
  )
}
