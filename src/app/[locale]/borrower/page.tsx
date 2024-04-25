"use client"

import Link from "next/link"
import { useTranslation } from "react-i18next"
import { Box, Button, Typography } from "@mui/material"

import { ROUTES } from "@/routes"
import { ContentContainer } from "@/app/[locale]/borrower/page-style"
import { LeadBanner } from "@/components/LeadBanner"
import { useBorrowerInvitationRedirect } from "./hooks/useBorrowerInvitationRedirect"

export default function Borrower() {
  const { t } = useTranslation()
  const bannerDisplayConfig = useBorrowerInvitationRedirect()

  return (
    <Box>
      <Box sx={ContentContainer}>
        <Typography variant="title2">{t("header")}</Typography>

        {!bannerDisplayConfig.hideNewMarketButton && (
          <Link href={ROUTES.borrower.newMarket}>
            <Button variant="contained" size="small">
              {t("newMarketButton")}
            </Button>
          </Link>
        )}
      </Box>

      {!bannerDisplayConfig.hideBanner && (
        <LeadBanner
          title={bannerDisplayConfig.title}
          text={bannerDisplayConfig.text}
          buttonText={bannerDisplayConfig.buttonText}
          buttonLink={bannerDisplayConfig.link}
        />
      )}
    </Box>
  )
}
