"use client"

import React, { useEffect } from "react"

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
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setTab } from "@/store/slices/borrowerOverviewSlice/borrowerOverviewSlice"
import { BorrowerOverviewTabs } from "@/store/slices/borrowerOverviewSlice/interface"

import { PoliciesTable } from "./components/PoliciesTable"
import { useBorrowerInvitationRedirect } from "./hooks/useBorrowerInvitationRedirect"
import { PageTitleContainer } from "./page-style"

export default function Borrower() {
  const dispatch = useAppDispatch()
  const tab = useAppSelector((state) => state.borrowerOverview.tab)

  const { t } = useTranslation()
  const bannerDisplayConfig = useBorrowerInvitationRedirect()

  const { isConnected } = useAccount()

  const { data: controller } = useGetController()
  const { isWrongNetwork } = useCurrentNetwork()
  const isRegisteredBorrower = controller?.isRegisteredBorrower

  const showBorrowerTables =
    !isWrongNetwork && isConnected && isRegisteredBorrower

  const handleTabsChange = (
    event: React.SyntheticEvent,
    newTab: BorrowerOverviewTabs,
  ) => {
    dispatch(setTab(newTab))
  }

  const { data: lenders } = useGetAllLenders()

  const selectedLendersStore = useAppSelector(
    (state) => state.borrowerLendersTabSidebar.lenderFilter,
  )
  const selectedMarketsStore = useAppSelector(
    (state) => state.borrowerLendersTabSidebar.marketFilter,
  )
  const searchStore = useAppSelector(
    (state) => state.borrowerLendersTabSidebar.searchFilter,
  )
  const lendersNames: { [key: string]: string } = JSON.parse(
    typeof window !== "undefined"
      ? localStorage.getItem("lenders-name") || "{}"
      : "{}",
  )

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

  const filteredLendersData = (lendersData ?? []).filter((lender) => {
    const searchFilterLower = searchStore.toLowerCase()

    const isLenderMatchedBySearch =
      (lendersNames[lender.address] ?? "")
        .toLowerCase()
        .includes(searchFilterLower) ||
      lender.address.toLowerCase().includes(searchFilterLower)

    const isMarketMatchedBySearch = lender.markets.some(
      (market) =>
        market.name.toLowerCase().includes(searchFilterLower) ||
        market.address.toLowerCase().includes(searchFilterLower),
    )

    const matchesSearch =
      searchStore === "" || isLenderMatchedBySearch || isMarketMatchedBySearch

    const isLenderSelected =
      selectedLendersStore.length === 0 ||
      selectedLendersStore.some(
        (selectedLender) => selectedLender.address === lender.address,
      )

    const hasSelectedMarkets =
      selectedMarketsStore.length === 0 ||
      lender.markets.some((market) =>
        selectedMarketsStore.some(
          (selectedMarket) => selectedMarket.address === market.address,
        ),
      )

    if (selectedLendersStore.length > 0 && selectedMarketsStore.length > 0) {
      return isLenderSelected && hasSelectedMarkets && matchesSearch
    }
    if (selectedLendersStore.length > 0) {
      return isLenderSelected && matchesSearch
    }
    if (selectedMarketsStore.length > 0) {
      return hasSelectedMarkets && matchesSearch
    }

    return matchesSearch
  })

  const authorizedLenders = filteredLendersData?.filter(
    (lender) => lender.isAuthorized,
  )

  const deauthorizedLenders = filteredLendersData?.filter(
    (lender) => !lender.isAuthorized,
  )

  useEffect(() => {
    sessionStorage.setItem("previousPageUrl", window.location.href)
  }, [])

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
            {/* <Tab value="mla" label={t("borrowerMarketList.title.mla")} /> */}
            <Tab
              value="policies"
              label={t("borrowerMarketList.title.policies")}
            />
          </Tabs>
        ) : (
          <Typography variant="title2">
            {t("borrowerMarketList.title.allMarkets")}
          </Typography>
        )}

        {!bannerDisplayConfig.hideNewMarketButton &&
          tab === BorrowerOverviewTabs.MARKETS && (
            <Link href={ROUTES.borrower.createMarket}>
              <Button
                variant="contained"
                size="small"
                disabled={isWrongNetwork}
                sx={{ paddingTop: "8px", paddingBottom: "8px" }}
              >
                {t("borrowerMarketList.button.newMarket")}
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

      {tab === "policies" && (
        <Box
          sx={{
            height: `calc(100vh - 43px - 52px - 52px - 110px)`,
            display: "flex",
            flexDirection: "column",
            width: "100%",
            overflow: "hidden",
            overflowY: "visible",
          }}
        >
          {/* <LendersTable
            tableData={authorizedLenders}
            isLoading={false}
            isOpen
            label="Active Lenders"
          /> */}

          <PoliciesTable isOpen label="Policies" />

          {/* <Box marginTop="16px">
            <LendersTable
              tableData={deauthorizedLenders}
              isLoading={false}
              label="Deleted Lenders"
            />
          </Box> */}
        </Box>
      )}
    </Box>
  )
}
