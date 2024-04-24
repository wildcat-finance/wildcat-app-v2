"use client"

import { Box, Button, Typography } from "@mui/material"
import Link from "next/link"
import { ROUTES } from "@/routes"
import { ContentContainer } from "@/app/[locale]/borrower/page-style"
import { Banner } from "@/components/Banner"
import { useTranslation } from "react-i18next"

const bannerData = {
  hideBanner: false,
  hideCreateButton: false,
  title: "Apply to become a borrower",
  text: "We see you aren't whitelisted as a borrower. Please complete this Typeform and we'll reach out for next steps.",
  buttonText: "Leave a Request",
  url: "https://forms.gle/irca7KeC7ASmkRh16",
}

export default function Borrower() {
  const { t } = useTranslation()

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
