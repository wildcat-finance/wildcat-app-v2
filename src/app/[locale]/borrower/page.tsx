"use client"

import { Box, Button, Typography } from "@mui/material"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { LeadBanner } from "@/components/LeadBanner"
import { ROUTES } from "@/routes"

import { BorrowerMarketsTable } from "./components/BorrowerMarketsTable"
import { OthersMarketsTable } from "./components/OthersMarketsTable"
import { useBorrowerInvitationRedirect } from "./hooks/useBorrowerInvitationRedirect"
import { useMarketsForBorrower } from "./hooks/useMarketsForBorrower"
import { PageTitleContainer } from "./page-style"

export default function Borrower() {
  const { t } = useTranslation()
  const bannerDisplayConfig = useBorrowerInvitationRedirect()

  const { data: allMarkets, isLoading } = useMarketsForBorrower()
  const { address } = useAccount()

  const activeBorrowerMarkets = allMarkets?.filter(
    (market) =>
      market.borrower.toLowerCase() === address?.toLowerCase() &&
      !market.isClosed,
  )

  const terminatedBorrowerMarkets = allMarkets?.filter(
    (market) =>
      market.borrower.toLowerCase() === address?.toLowerCase() &&
      market.isClosed,
  )

  const othersMarkets = allMarkets?.filter(
    (market) => market.borrower.toLowerCase() !== address?.toLowerCase(),
  )

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
        <BorrowerMarketsTable
          label="Your Active Markets"
          noMarketsTitle="You don’t have active markets"
          noMarketsSubtitle="You have only Terminated Markets. You can create a new one or check Terminated"
          tableData={activeBorrowerMarkets}
          isLoading={isLoading}
        />
      </Box>

      <Box marginTop="16px">
        <BorrowerMarketsTable
          label="Your Terminated Markets"
          noMarketsTitle="You don’t have terminated markets"
          noMarketsSubtitle="You have only active Markets."
          tableData={terminatedBorrowerMarkets}
          isLoading={isLoading}
        />
      </Box>

      <Box marginTop="16px">
        <OthersMarketsTable tableData={othersMarkets} isLoading={isLoading} />
      </Box>
    </Box>
  )
}
