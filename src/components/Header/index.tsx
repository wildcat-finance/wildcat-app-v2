"use client"

import { useEffect, useMemo, useState } from "react"

import {
  Box,
  Skeleton,
  SvgIcon,
  Switch,
  Typography,
  useTheme,
} from "@mui/material"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"

import Logo from "@/assets/icons/logo_white.svg"
import MobileLogo from "@/assets/icons/noNameLogo_icon.svg"
import LogoBlack from "@/assets/icons/sale_logo_black.svg"
import { contentContainer, NavContainer } from "@/components/Header/style"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { ROUTES } from "@/routes"
import { useAppDispatch } from "@/store/hooks"
import { setTab } from "@/store/slices/borrowerOverviewSlice/borrowerOverviewSlice"
import { BorrowerOverviewTabs } from "@/store/slices/borrowerOverviewSlice/interface"
import { COLORS } from "@/theme/colors"

import { HeaderButton } from "./HeaderButton"
import { HeaderNetworkButton } from "./HeaderNetworkButton"
import { MobileMenu } from "./MobileMenu"

export default function Header() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMobileResolution()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false)

  const router = useRouter()
  const pathname = usePathname()
  const dispatch = useAppDispatch()

  // Set default to "lender"
  const [side, setSide] = useState<"lender" | "borrower">("lender")

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
    () => (side === "lender" ? ROUTES.lender.root : ROUTES.borrower.root),
    [side],
  )

  // const mobileLogo = side ? <LogoBlack /> : <LogoWhite />

  if (!mounted)
    return (
      <Box
        sx={{
          width: "100%",
          padding: {
            xs: "4px",
            md: 0,
          },
        }}
      >
        <Skeleton
          sx={{
            height: {
              xs: "56px",
              md: "82px",
            },
            width: "100%",
            borderRadius: "14px",
            backgroundColor: {
              xs: COLORS.white06,
              md: "transparent",
            },
          }}
        />
      </Box>
    )

  return (
    <>
      {isMobile && <Box sx={{ width: "100%", height: "64px" }} />}

      <Box sx={contentContainer(theme)}>
        <Link
          onClick={handleResetTab}
          href={homeUrl}
          style={{ height: isMobile ? "32px" : "50px" }}
        >
          {isMobile && (
            <SvgIcon sx={{ fontSize: "32px" }}>
              <MobileLogo />
            </SvgIcon>
          )}
          {!isMobile && <Logo />}
        </Link>
        {!isMobile && (
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
        )}
        {/* <NotificationButton /> */}
        {!isMobile && (
          <div style={{ display: "flex", gap: "8px" }}>
            <HeaderNetworkButton />
            <HeaderButton />
          </div>
        )}
        {isMobile && (
          <MobileMenu open={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
        )}
      </Box>
    </>
  )
}
