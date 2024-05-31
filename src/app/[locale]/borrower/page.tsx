"use client"

import { Box, Button, Typography } from "@mui/material"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { LeadBanner } from "@/components/LeadBanner"
import { ROUTES } from "@/routes"

import { BorrowerActiveMarketsTable } from "./components/BorrowerActiveMarketsTable"
import { useBorrowerInvitationRedirect } from "./hooks/useBorrowerInvitationRedirect"
import { useMarketsForBorrower } from "./hooks/useMarketsForBorrower"
import { PageTitleContainer } from "./page-style"

export default function Borrower() {
  const { t } = useTranslation()
  const bannerDisplayConfig = useBorrowerInvitationRedirect()

  const { address } = useAccount()
  const { data, isLoading } = useMarketsForBorrower(address)

  return (
    <Box>
      <Box sx={PageTitleContainer}>
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

      <Box>
        <BorrowerActiveMarketsTable tableData={data} isLoading={isLoading} />
      </Box>
    </Box>
  )
}
