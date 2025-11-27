import * as React from "react"

import { Box, Button, Divider, SvgIcon } from "@mui/material"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"

import Arrow from "@/assets/icons/arrowLeft_icon.svg"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"

import { MobileNamePageBlockWrapperProps } from "./interface"
import {
  MobileBackButton,
  MobileBackButtonIcon,
  MobileDivider,
  MobileNameBlockContainer,
  MobileSwitchButton,
  MobileSwitchContainer,
} from "./style"

export const MobileNamePageBlockWrapper = ({
  section,
  setSection,
  marketsAmount,
  children,
}: MobileNamePageBlockWrapperProps) => {
  const { t } = useTranslation()

  const pathname = usePathname()
  const backLink = pathname.includes(ROUTES.borrower.profile)
    ? ROUTES.borrower.root
    : ROUTES.lender.root

  const handleChangeSection = (sectionTab: "markets" | "info") => {
    setSection(sectionTab)
  }

  return (
    <Box sx={MobileNameBlockContainer}>
      <Link href={backLink} style={MobileBackButton}>
        <SvgIcon sx={MobileBackButtonIcon}>
          <Arrow />
        </SvgIcon>
      </Link>

      {children}

      {marketsAmount !== 0 && <Divider sx={MobileDivider} />}

      {marketsAmount !== 0 && (
        <Box sx={MobileSwitchContainer}>
          <Button
            onClick={() => handleChangeSection("markets")}
            sx={{
              ...MobileSwitchButton,
              backgroundColor:
                section === "markets" ? COLORS.whiteSmoke : "transparent",
            }}
          >
            {t("borrowerProfile.profile.activeMarkets.title")}
          </Button>
          <Button
            onClick={() => handleChangeSection("info")}
            sx={{
              ...MobileSwitchButton,
              backgroundColor:
                section === "info" ? COLORS.whiteSmoke : "transparent",
            }}
          >
            {t("borrowerProfile.profile.overallInfo.title")}
          </Button>
        </Box>
      )}
    </Box>
  )
}
