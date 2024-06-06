"use client"

import React from "react"

import { Box, Button, Tab, Tabs, Typography } from "@mui/material"
import { Market } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { useGetBorrowers } from "@/app/[locale]/borrower/hooks/useGetBorrowers"
import { LeadBanner } from "@/components/LeadBanner"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useGetController } from "@/hooks/useGetController"
import { ROUTES } from "@/routes"
import { useAppSelector } from "@/store/hooks"
import { SidebarMarketAssets } from "@/store/slices/borrowerSidebarSlice/interface"
import { getMarketStatus, MarketStatus } from "@/utils/marketStatus"

import { BorrowerMarketsTable } from "./components/BorrowerMarketsTable"
import { OthersMarketsTable } from "./components/OthersMarketsTable"
import { useBorrowerInvitationRedirect } from "./hooks/useBorrowerInvitationRedirect"
import { useMarketsForBorrower } from "./hooks/useMarketsForBorrower"
import { PageTitleContainer } from "./page-style"

const filterMarketsByAssetAndStatus = (
  markets: Market[] | undefined,
  name: string,
  status: MarketStatus | "All",
  asset: SidebarMarketAssets,
) => {
  let filteredMarkets = markets

  if (filteredMarkets && name !== "") {
    filteredMarkets = filteredMarkets.filter((market) =>
      market.name.toLowerCase().includes(name.toLowerCase()),
    )
  }

  if (filteredMarkets && status !== "All") {
    filteredMarkets = filteredMarkets.filter(
      (market) =>
        getMarketStatus(
          market.isClosed,
          market.isDelinquent,
          market.isIncurringPenalties,
        ) === status,
    )
  }

  if (filteredMarkets && asset !== "All") {
    filteredMarkets = filteredMarkets.filter(
      (market) => market.underlyingToken.symbol === asset,
    )
  }

  return filteredMarkets
}

export default function Borrower() {
  const { t } = useTranslation()
  const bannerDisplayConfig = useBorrowerInvitationRedirect()
  const { data: borrowers } = useGetBorrowers()
  const { data: allMarkets, isLoading, error } = useMarketsForBorrower()
  const { address, isConnected } = useAccount()
  const { isWrongNetwork } = useCurrentNetwork()
  const { data: controller } = useGetController()
  const isRegisteredBorrower = controller?.isRegisteredBorrower
  const controllerMarkets = controller?.markets || []

  const filterByMarketName = useAppSelector(
    (state) => state.borrowerSidebar.marketName,
  )
  const filterByStatus = useAppSelector((state) => state.borrowerSidebar.status)
  const filterByAsset = useAppSelector(
    (state) => state.borrowerSidebar.underlyingAsset,
  )

  const filteredMarkets = filterMarketsByAssetAndStatus(
    allMarkets,
    filterByMarketName,
    filterByStatus,
    filterByAsset,
  )

  const activeBorrowerMarkets = filteredMarkets?.filter(
    (market) =>
      market.borrower.toLowerCase() === address?.toLowerCase() &&
      !market.isClosed,
  )

  const terminatedBorrowerMarkets = allMarkets
    ?.filter(
      (market) =>
        market.borrower.toLowerCase() === address?.toLowerCase() &&
        market.isClosed,
    )
    .filter((market) =>
      market.name.toLowerCase().includes(filterByMarketName.toLowerCase()),
    )

  const othersMarkets = filteredMarkets?.filter(
    (market) => market.borrower.toLowerCase() !== address?.toLowerCase(),
  )

  const showBorrowerTables =
    isConnected && isRegisteredBorrower && !!controllerMarkets.length

  const othersTableData = showBorrowerTables ? othersMarkets : filteredMarkets

  const [tab, setTab] = React.useState("markets")

  const handleTabsChange = (event: React.SyntheticEvent, newTab: string) => {
    setTab(newTab)
  }

  return (
    <Box>
      <Box sx={PageTitleContainer}>
        {showBorrowerTables ? (
          <Tabs
            value={tab}
            onChange={handleTabsChange}
            aria-label="Borrower market list tabs"
          >
            <Tab value="markets" label="All markets" />
            <Tab value="mla" label="MLA" />
            <Tab value="lenders" label="Lenders" />
          </Tabs>
        ) : (
          <Typography variant="title2">{t("header")}</Typography>
        )}

        {!bannerDisplayConfig.hideNewMarketButton && (
          <Link href={ROUTES.borrower.newMarket}>
            <Button variant="contained" size="small" disabled={isWrongNetwork}>
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

      {tab === "markets" && (
        <>
          {showBorrowerTables && (
            <Box>
              <Box>
                <BorrowerMarketsTable
                  type="active"
                  label="Your Active Markets"
                  noMarketsTitle="You don’t have active markets"
                  noMarketsSubtitle="You have only Terminated Markets. You can create a new one or check Terminated"
                  tableData={activeBorrowerMarkets || []}
                  isLoading={isLoading}
                  assetFilter={filterByAsset}
                  statusFilter={filterByStatus}
                  nameFilter={filterByMarketName}
                  isOpen
                />
              </Box>

              <Box marginTop="16px">
                <BorrowerMarketsTable
                  type="terminated"
                  label="Your Terminated Markets"
                  noMarketsTitle="You don’t have terminated markets"
                  noMarketsSubtitle="You have only active Markets."
                  tableData={terminatedBorrowerMarkets || []}
                  isLoading={isLoading}
                  nameFilter={filterByMarketName}
                />
              </Box>
            </Box>
          )}

          <Box marginTop="16px">
            <OthersMarketsTable
              tableData={othersTableData || []}
              borrowersData={borrowers || []}
              isLoading={isLoading}
              assetFilter={filterByAsset}
              statusFilter={filterByStatus}
              nameFilter={filterByMarketName}
              isOpen
            />
          </Box>
        </>
      )}
    </Box>
  )
}
