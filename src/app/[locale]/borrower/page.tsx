"use client"

import { Box, Button, Typography } from "@mui/material"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { LeadBanner } from "@/components/LeadBanner"
import { useGetController } from "@/hooks/useGetController"
import { ROUTES } from "@/routes"
import { useAppSelector } from "@/store/hooks"
import { getMarketStatus } from "@/utils/marketStatus"

import { BorrowerMarketsTable } from "./components/BorrowerMarketsTable"
import { OthersMarketsTable } from "./components/OthersMarketsTable"
import { useBorrowerInvitationRedirect } from "./hooks/useBorrowerInvitationRedirect"
import { useMarketsForBorrower } from "./hooks/useMarketsForBorrower"
import { PageTitleContainer } from "./page-style"

export default function Borrower() {
  const { t } = useTranslation()
  const bannerDisplayConfig = useBorrowerInvitationRedirect()

  const { data: allMarkets, isLoading } = useMarketsForBorrower()
  const { address, isConnected } = useAccount()
  const { data: controller } = useGetController()
  const isRegisteredBorrower = controller?.isRegisteredBorrower
  const controllerMarkets = controller?.markets || []

  const filterByStatus = useAppSelector((state) => state.borrowerSidebar.status)
  const filterByAsset = useAppSelector(
    (state) => state.borrowerSidebar.underlyingAsset,
  )

  let filteredMarkets = allMarkets

  if (filteredMarkets && filterByStatus !== "All") {
    filteredMarkets = filteredMarkets.filter(
      (market) =>
        getMarketStatus(
          market.isClosed,
          market.isDelinquent,
          market.isIncurringPenalties,
        ) === filterByStatus,
    )
  }

  if (filteredMarkets && filterByAsset !== "All") {
    filteredMarkets = filteredMarkets.filter(
      (market) => market.underlyingToken.symbol === filterByAsset,
    )
  }

  const activeBorrowerMarkets = filteredMarkets?.filter(
    (market) =>
      market.borrower.toLowerCase() === address?.toLowerCase() &&
      !market.isClosed,
  )

  const terminatedBorrowerMarkets = filteredMarkets?.filter(
    (market) =>
      market.borrower.toLowerCase() === address?.toLowerCase() &&
      market.isClosed,
  )

  const othersMarkets = filteredMarkets?.filter(
    (market) => market.borrower.toLowerCase() !== address?.toLowerCase(),
  )

  const showBorrowerTables =
    isConnected && isRegisteredBorrower && !!controllerMarkets.length

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

      {showBorrowerTables && (
        <Box>
          <Box>
            <BorrowerMarketsTable
              label="Your Active Markets"
              noMarketsTitle="You don’t have active markets"
              noMarketsSubtitle="You have only Terminated Markets. You can create a new one or check Terminated"
              tableData={activeBorrowerMarkets}
              isLoading={isLoading}
              isOpen
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
        </Box>
      )}

      <Box marginTop="16px">
        <OthersMarketsTable
          tableData={showBorrowerTables ? othersMarkets : filteredMarkets}
          isLoading={isLoading}
          isOpen
        />
      </Box>
    </Box>
  )
}
