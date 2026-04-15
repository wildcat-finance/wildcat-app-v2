"use client"

import { Box, Typography } from "@mui/material"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { ROUTES } from "@/routes"
import { useAppSelector } from "@/store/hooks"
import { COLORS } from "@/theme/colors"

const IconPlaceholder = () => (
  <Box
    sx={{
      width: "16px",
      height: "16px",
      borderRadius: "3px",
      backgroundColor: COLORS.santasGrey,
      flexShrink: 0,
    }}
  />
)

const CountBadge = ({ count }: { count: number }) => (
  <Box
    sx={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: "18px",
      height: "18px",
      borderRadius: "20px",
      backgroundColor: COLORS.glitter,
      paddingX: "5px",
    }}
  >
    <Typography
      variant="text4"
      sx={{
        color: COLORS.ultramarineBlue,
        fontWeight: 600,
        lineHeight: "16px",
      }}
    >
      {count}
    </Typography>
  </Box>
)

type NavItemProps = {
  href: string
  label: string
  active: boolean
  badge?: number
}

const NavItem = ({ href, label, active, badge }: NavItemProps) => (
  <Box
    component={Link}
    href={href}
    sx={{
      width: "100%",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "6px 12px",
      borderRadius: "8px",
      backgroundColor: active ? COLORS.whiteSmoke : "transparent",
      textDecoration: "none",
      transition: "background-color 0.1s ease-in-out",
      "&:hover": {
        backgroundColor: COLORS.whiteSmoke,
      },
    }}
  >
    <Typography variant="text2">{label}</Typography>
    {badge !== undefined && badge > 0 && <CountBadge count={badge} />}
  </Box>
)

export const LenderNavSidebar = () => {
  const pathname = usePathname()

  const depositedAmount = useAppSelector(
    (state) => state.lenderDashboardAmounts.deposited,
  )
  const nonDepositedAmount = useAppSelector(
    (state) => state.lenderDashboardAmounts.nonDeposited,
  )
  const prevActiveAmount = useAppSelector(
    (state) => state.lenderDashboardAmounts.prevActive,
  )
  const neverActiveAmount = useAppSelector(
    (state) => state.lenderDashboardAmounts.neverActive,
  )

  const myMarketsCount =
    depositedAmount + nonDepositedAmount + prevActiveAmount + neverActiveAmount

  return (
    <Box
      sx={{
        height: "100%",
        width: "267px",
        padding: "42px 16px 0px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      <NavItem
        href={ROUTES.lender.explore}
        label="Explore"
        active={pathname === ROUTES.lender.explore}
      />
      <NavItem
        href={ROUTES.lender.myMarkets}
        label="My Markets"
        active={pathname === ROUTES.lender.myMarkets}
        badge={myMarketsCount}
      />
      <NavItem
        href={ROUTES.lender.allMarkets}
        label="All Markets"
        active={pathname === ROUTES.lender.allMarkets}
      />
    </Box>
  )
}
