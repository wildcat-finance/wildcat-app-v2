"use client"

import { useEffect, useMemo, useState } from "react"

import { Box, Switch, Typography } from "@mui/material"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"

import Logo from "@/assets/icons/logo_white.svg"
import { ContentContainer, NavContainer } from "@/components/Header/style"
import { ROUTES } from "@/routes"
import { useAppDispatch } from "@/store/hooks"
import { setTab } from "@/store/slices/borrowerOverviewSlice/borrowerOverviewSlice"
import { BorrowerOverviewTabs } from "@/store/slices/borrowerOverviewSlice/interface"
import { COLORS } from "@/theme/colors"

import { HeaderButton } from "./HeaderButton"
import { NotificationButton } from "./NotificationButton"

export default function Header() {
  const { t } = useTranslation()

  const router = useRouter()
  const pathname = usePathname()
  const dispatch = useAppDispatch()

  // Set default to "lender"
  const [side, setSide] = useState<"borrower" | "lender">("lender")

  const handleToggleSide = () => {
    if (side === "borrower") {
      setSide("lender")
      router.push(ROUTES.lender.root)
    } else {
      setSide("borrower")
      router.push(ROUTES.borrower.root)
    }
  }

  useEffect(() => {
    // Default to lender unless explicitly on borrower path
    if (pathname.includes(ROUTES.borrower.root)) {
      setSide("borrower")
    } else {
      setSide("lender")
    }
  }, [pathname])

  const handleResetTab = () => {
    if (side === "borrower") {
      dispatch(setTab(BorrowerOverviewTabs.MARKETS))
    }
  }

  const homeUrl = useMemo(
    () => (side === "borrower" ? ROUTES.borrower.root : ROUTES.lender.root),
    [side],
  )

  return (
    <Box sx={ContentContainer}>
      <Link onClick={handleResetTab} href={homeUrl} style={{ height: "50px" }}>
        <Logo />
      </Link>
      <Box sx={NavContainer}>
        {/* Lender on the left */}
        <Link href={ROUTES.lender.root} style={{ textDecoration: "none" }}>
          <Typography
            variant="text2Highlighted"
            sx={{ color: COLORS.white, cursor: "pointer" }}
          >
            {t("header.role.lender")}
          </Typography>
        </Link>
        <Switch
          sx={{
            "& .MuiSwitch-switchBase": {
              "&.Mui-checked": {
                "& + .MuiSwitch-track": {
                  opacity: 0.3,
                  backgroundColor: COLORS.white,
                },
              },
            },
            "& .MuiSwitch-track": {
              opacity: 0.3,
              backgroundColor: COLORS.white,
            },
          }}
          onClick={handleToggleSide}
          checked={side === "borrower"}
        />
        <Link
          onClick={handleResetTab}
          href={ROUTES.borrower.root}
          style={{ textDecoration: "none" }}
        >
          <Typography
            variant="text2Highlighted"
            sx={{ color: COLORS.white, cursor: "pointer" }}
          >
            {t("header.role.borrower")}
          </Typography>
        </Link>
      </Box>
      {/* <NotificationButton /> */}
      <HeaderButton />
    </Box>
  )
}
