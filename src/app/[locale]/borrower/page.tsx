"use client"

import { Box, Button, Typography } from "@mui/material"
import Link from "next/link"
import { ROUTES } from "@/routes"
import { ContentContainer } from "@/app/[locale]/borrower/page-style"
import { Banner } from "@/components/Banner"
import { useBorrowerBannerState } from "@/hooks/useBorrowerBannerState"
import { useTranslation } from "react-i18next"

export default function Borrower() {
  const { t } = useTranslation()
  const bannerData = useBorrowerBannerState()

  return (
    <Box>
      <Box sx={ContentContainer}>
        <Typography variant="title2">{t("header")}</Typography>
        {!bannerData.hideCreateButton && (
          <Link href={ROUTES.borrowerMarket}>
            <Button variant="contained" size="small">
              {t("newMarketButton")}
            </Button>
          </Link>
        )}
      </Box>
      {!bannerData.hideBanner && (
        <Banner
          title={bannerData.title}
          text={bannerData.text}
          buttonText={bannerData.buttonText}
          buttonLink={bannerData.url}
        />
      )}
    </Box>
  )
}
