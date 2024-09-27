"use client"

import React from "react"

import { Box, Button, Tab, Tabs, Typography } from "@mui/material"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { LendersTable } from "@/app/[locale]/borrower/components/AuthorizedLendersTable"
import { MarketsTables } from "@/app/[locale]/borrower/components/MarketsTables"
import { useGetAllLenders } from "@/app/[locale]/borrower/hooks/useGetAllLenders"
import { LeadBanner } from "@/components/LeadBanner"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useGetController } from "@/hooks/useGetController"
import { ROUTES } from "@/routes"

import { useBorrowerInvitationRedirect } from "./hooks/useBorrowerInvitationRedirect"
import { PageTitleContainer } from "./page-style"

export default function Borrower() {
  const { t } = useTranslation()
  const bannerDisplayConfig = useBorrowerInvitationRedirect()

  const { isConnected } = useAccount()

  const { data: controller } = useGetController()
  const { isWrongNetwork } = useCurrentNetwork()
  const isRegisteredBorrower = controller?.isRegisteredBorrower

  const showBorrowerTables =
    !isWrongNetwork && isConnected && isRegisteredBorrower

  const [tab, setTab] = React.useState<"markets" | "mla" | "lenders">("markets")

  const handleTabsChange = (
    event: React.SyntheticEvent,
    newTab: "markets" | "mla" | "lenders",
  ) => {
    setTab(newTab)
  }

  const { data: lenders } = useGetAllLenders()

  const lendersData = lenders?.addresses
    .map((a) => lenders?.lenders[a])
    .map((l) => ({
      ...l,
      markets: l?.markets.marketIds.map((m) => l?.markets.markets[m]),
    }))
    .map((lender) => ({
      address: lender.lender,
      isAuthorized: lender.authorized,
      markets: lender.markets.map((market) => ({
        name: market.name,
        address: market.id,
      })),
    }))

  const authorizedLenders = lendersData?.filter((lender) => lender.isAuthorized)

  const deauthorizedLenders = lendersData?.filter(
    (lender) => !lender.isAuthorized,
  )

  return (
    <Box
      sx={{ height: "calc(100vh - 43px - 43px - 52px)", overflow: "hidden" }}
    >
      <Box sx={PageTitleContainer}>
        {showBorrowerTables ? (
          <Tabs
            value={tab}
            onChange={handleTabsChange}
            aria-label="Borrower market list tabs"
          >
            <Tab
              value="markets"
              label={t("borrowerMarketList.title.allMarkets")}
            />
            <Tab value="mla" label={t("borrowerMarketList.title.mla")} />
            <Tab
              value="lenders"
              label={t("borrowerMarketList.title.lenders")}
            />
          </Tabs>
        ) : (
          <Typography variant="title2">
            {t("borrowerMarketList.title.allMarkets")}
          </Typography>
        )}

        {!bannerDisplayConfig.hideNewMarketButton && (
          <Link
            href={
              tab === "markets"
                ? ROUTES.borrower.newMarket
                : ROUTES.borrower.lendersList
            }
          >
            <Button
              variant="contained"
              size="small"
              disabled={isWrongNetwork}
              sx={{ paddingTop: "8px", paddingBottom: "8px" }}
            >
              {tab === "markets"
                ? `${t("borrowerMarketList.button.newMarket")}`
                : "Edit Lender list"}
            </Button>
          </Link>
        )}
      </Box>

      {!bannerDisplayConfig.hideBanner && (
        <Box padding="0 16px">
          <LeadBanner
            title={bannerDisplayConfig.title}
            text={bannerDisplayConfig.text}
            buttonText={bannerDisplayConfig.buttonText}
            buttonLink={bannerDisplayConfig.link}
          />
        </Box>
      )}

      {tab === "markets" && (
        <MarketsTables showBanner={!bannerDisplayConfig.hideBanner} />
      )}

      {tab === "lenders" && (
        <Box>
          <LendersTable
            tableData={authorizedLenders ?? []}
            isLoading={false}
            isOpen
            label="Active Lenders"
          />

          <Box marginTop="16px">
            <LendersTable
              tableData={deauthorizedLenders ?? []}
              isLoading={false}
              label="Deleted Lenders"
            />
          </Box>
        </Box>
      )}
    </Box>
  )
}
