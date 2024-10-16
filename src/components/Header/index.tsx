"use client"

import { useEffect, useState } from "react"

import { Box, Switch, Typography } from "@mui/material"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"

import Logo from "@/assets/icons/logo_white.svg"
import { ContentContainer, NavContainer } from "@/components/Header/style"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"

import { HeaderButton } from "./HeaderButton"
import { NotificationButton } from "./NotificationButton"

export default function Header() {
  const { t } = useTranslation()

  const router = useRouter()
  const pathname = usePathname()

  const [side, setSide] = useState<"borrower" | "lender">()

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
    if (pathname.includes(ROUTES.borrower.root)) {
      setSide("borrower")
    } else setSide("lender")
  }, [])

  return (
    <Box sx={ContentContainer}>
      <Link href={ROUTES.borrower.root} style={{ height: "50px" }}>
        <Logo />
      </Link>
      <Box sx={NavContainer}>
        <Typography variant="text2Highlighted" sx={{ color: COLORS.white }}>
          {t("header.role.borrower")}
        </Typography>
        <Switch onClick={handleToggleSide} checked={side === "lender"} />
        <Typography variant="text2Highlighted" sx={{ color: COLORS.white }}>
          {t("header.role.lender")}
        </Typography>
      </Box>
      <NotificationButton />
      <HeaderButton />
    </Box>
  )
}
