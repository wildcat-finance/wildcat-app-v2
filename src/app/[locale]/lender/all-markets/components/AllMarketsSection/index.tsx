"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"

import { Box, Skeleton, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { getAllMarketsAmounts } from "@/app/[locale]/lender/components/LenderDataProvider/allMarketsAmounts"
import { LenderMarketsMobileHeader } from "@/app/[locale]/lender/components/LenderMarketsMobileHeader"
import { useLenderMarketsContext } from "@/app/[locale]/lender/context"
import { ComposableOnlySwitch } from "@/components/Destinations"
import { FilterTextField } from "@/components/FilterTextfield"
import { MarketsFilterSelect } from "@/components/MarketsFilterSelect"
import { MarketsFilterSelectItem } from "@/components/MarketsFilterSelect/interface"
import { MarketsTabs } from "@/components/MarketsTabs"
import { MobileFilterButton } from "@/components/Mobile/MobileFilterButton"
import { MobileMarketsToolbar } from "@/components/Mobile/MobileMarketsToolbar"
import { MobileSearchButton } from "@/components/Mobile/MobileSearchButton"
import { WrongNetworkAlert } from "@/components/WrongNetworkAlert"
import { useDestinations } from "@/hooks/destinations/useDestinations"
import { useAllTokensWithMarkets } from "@/hooks/useAllTokensWithMarkets"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { marketStatusesMock } from "@/mocks/mocks"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setLendersSectionAmount } from "@/store/slices/lenderDashboardAmountSlice/lenderDashboardAmountsSlice"
import {
  LenderAllMarketsTab,
  LenderSection,
  resetOtherSectionTabs,
  setAllMarketsTab,
} from "@/store/slices/lenderDashboardSlice/lenderDashboardSlice"
import { setMarketFilters } from "@/store/slices/marketFiltersSlice/marketFiltersSlice"
import { COLORS } from "@/theme/colors"
import { EXCLUDED_MARKETS } from "@/utils/constants"
import { filterMarketAccounts } from "@/utils/filters"
import { MarketStatus } from "@/utils/marketStatus"

import { OtherMarketsTable } from "../MarketsTables/OtherMarketsTable"

const withdrawalCycleOptions = [
  { id: "0-86400", name: "≤ 24h" },
  { id: "86401-259200", name: "1 - 3 days" },
  { id: "259201-604800", name: "3 - 7 days" },
  { id: "604801-Infinity", name: "7+ days" },
]

export const AllMarketsSection = () => {
  const isMobile = useMobileResolution()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const dispatch = useAppDispatch()
  useEffect(() => {
    dispatch(resetOtherSectionTabs(LenderSection.ALL_MARKETS))
  }, [dispatch])
  const { t } = useTranslation()
  useAccount()
  const {
    isWrongNetwork,
    chainId: targetChainId,
    targetChainId: selectedChainId,
    isTestnet,
  } = useCurrentNetwork()

  const {
    marketAccounts,
    isLoadingInitial,
    onboardingByMarket,
    borrowers,
    defaults,
  } = useLenderMarketsContext()

  const destinations = useDestinations(selectedChainId)
  const { markets: destinationsByMarket } = destinations
  const composableSet = useMemo(
    () => new Set(Object.keys(destinationsByMarket)),
    [destinationsByMarket],
  )

  const allMarketsTab = useAppSelector((s) => s.lenderDashboard.allMarketsTab)
  const isDefaultedTab = allMarketsTab === LenderAllMarketsTab.DEFAULTED

  const marketFilters = useAppSelector((s) => s.marketFilters.lender)
  const {
    search: marketSearch,
    assets: marketAssets,
    statuses: marketStatuses,
    withdrawalCycles: marketWithdrawalCycles,
    composableOnly,
  } = marketFilters

  const composableFilterActive = composableOnly && !isDefaultedTab

  const setComposableOnly = useCallback(
    (value: boolean) =>
      dispatch(
        setMarketFilters({
          role: "lender",
          filters: { composableOnly: value },
        }),
      ),
    [dispatch],
  )

  const setMarketSearch: React.Dispatch<React.SetStateAction<string>> =
    useCallback(
      (value) => {
        const next =
          typeof value === "function"
            ? (value as (prev: string) => string)(marketSearch)
            : value
        dispatch(
          setMarketFilters({ role: "lender", filters: { search: next } }),
        )
      },
      [dispatch, marketSearch],
    )

  const setMarketAssets: React.Dispatch<
    React.SetStateAction<MarketsFilterSelectItem[]>
  > = useCallback(
    (value) => {
      const next =
        typeof value === "function"
          ? (
              value as (
                prev: MarketsFilterSelectItem[],
              ) => MarketsFilterSelectItem[]
            )(marketAssets)
          : value
      dispatch(setMarketFilters({ role: "lender", filters: { assets: next } }))
    },
    [dispatch, marketAssets],
  )

  const setMarketStatuses: React.Dispatch<
    React.SetStateAction<MarketsFilterSelectItem[]>
  > = useCallback(
    (value) => {
      const next =
        typeof value === "function"
          ? (
              value as (
                prev: MarketsFilterSelectItem[],
              ) => MarketsFilterSelectItem[]
            )(marketStatuses)
          : value
      dispatch(
        setMarketFilters({ role: "lender", filters: { statuses: next } }),
      )
    },
    [dispatch, marketStatuses],
  )

  const setMarketWithdrawalCycles: React.Dispatch<
    React.SetStateAction<MarketsFilterSelectItem[]>
  > = useCallback(
    (value) => {
      const next =
        typeof value === "function"
          ? (
              value as (
                prev: MarketsFilterSelectItem[],
              ) => MarketsFilterSelectItem[]
            )(marketWithdrawalCycles)
          : value
      dispatch(
        setMarketFilters({
          role: "lender",
          filters: { withdrawalCycles: next },
        }),
      )
    },
    [dispatch, marketWithdrawalCycles],
  )

  const filters = useMemo(
    () => ({
      nameFilter: marketSearch,
      assetFilter: marketAssets,
      statusFilter: marketStatuses.map(
        (status) => status.name,
      ) as MarketStatus[],
      withdrawalCycleFilter: marketWithdrawalCycles,
      composableOnly: composableFilterActive,
    }),
    [
      marketSearch,
      marketAssets,
      marketStatuses,
      marketWithdrawalCycles,
      composableFilterActive,
    ],
  )

  // Markets the lender has never interacted with, excluding blacklisted addresses
  const otherMarketAccounts = useMemo(
    () =>
      marketAccounts.filter(
        (account) =>
          !EXCLUDED_MARKETS.includes(account.market.address.toLowerCase()) &&
          !account.hasEverInteracted,
      ),
    [marketAccounts],
  )

  const { filteredMarketAccounts, composableCount } = useMemo(() => {
    const filtered = filterMarketAccounts(
      otherMarketAccounts,
      marketSearch,
      marketStatuses,
      marketAssets,
      borrowers ?? [],
      marketWithdrawalCycles,
    )
    const composable = filtered.filter((account) =>
      composableSet.has(account.market.address.toLowerCase()),
    )
    return {
      filteredMarketAccounts: composableFilterActive ? composable : filtered,
      composableCount: composable.length,
    }
  }, [
    otherMarketAccounts,
    marketSearch,
    marketStatuses,
    marketAssets,
    borrowers,
    marketWithdrawalCycles,
    composableSet,
    composableFilterActive,
  ])

  const showComposableSwitch =
    !isDefaultedTab && (composableCount > 0 || composableOnly)
  const isLoading =
    isLoadingInitial ||
    defaults.isLoading ||
    (composableFilterActive && destinations.isPending)

  const {
    selfOnboard: selfOnboardAmount,
    manual: manualAmount,
    terminatedOther: terminatedOtherAmount,
    defaultedOther: defaultedAmount,
  } = useMemo(
    () =>
      getAllMarketsAmounts(
        otherMarketAccounts,
        onboardingByMarket,
        defaults.isDefaulted,
      ),
    [otherMarketAccounts, onboardingByMarket, defaults.isDefaulted],
  )

  useEffect(() => {
    dispatch(
      setLendersSectionAmount({
        name: "selfOnboard",
        value: isWrongNetwork ? 0 : selfOnboardAmount,
      }),
    )
    dispatch(
      setLendersSectionAmount({
        name: "manual",
        value: isWrongNetwork ? 0 : manualAmount,
      }),
    )
    dispatch(
      setLendersSectionAmount({
        name: "terminatedOther",
        value: isWrongNetwork ? 0 : terminatedOtherAmount,
      }),
    )
    dispatch(
      setLendersSectionAmount({
        name: "defaultedOther",
        value: isWrongNetwork ? 0 : defaultedAmount,
      }),
    )
    dispatch(
      setLendersSectionAmount({
        name: "allMarkets",
        value: isWrongNetwork
          ? 0
          : selfOnboardAmount +
            manualAmount +
            terminatedOtherAmount +
            defaultedAmount,
      }),
    )
  }, [
    selfOnboardAmount,
    manualAmount,
    terminatedOtherAmount,
    defaultedAmount,
    isWrongNetwork,
    dispatch,
  ])

  const defaultedTabCount =
    defaults.isLoading || defaults.isError ? undefined : defaultedAmount

  const { data: tokensRaw } = useAllTokensWithMarkets()
  const tokens = useMemo(() => {
    if (isTestnet) {
      return tokensRaw?.filter(
        (token, index, self) =>
          index === self.findIndex((x) => x.symbol === token.symbol),
      )
    }
    return tokensRaw
  }, [tokensRaw, targetChainId])

  if (!mounted)
    return (
      <Skeleton
        sx={{
          width: "100%",
          height: { xs: "124px", md: "152px" },
          borderRadius: "14px",
          backgroundColor: { xs: COLORS.white06, md: "transparent" },
        }}
      />
    )

  return (
    <Box sx={{ width: "100%", overflow: { xs: "auto", md: "visible" } }}>
      {!isMobile && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            padding: "20px 16px 0",
          }}
        >
          <Typography variant="title3" color={COLORS.blackRock}>
            {t("dashboard.markets.allMarketsTitle")}
          </Typography>

          <Box sx={{ marginTop: "16px" }}>
            <MarketsTabs
              value={allMarketsTab}
              onChange={(tab) => dispatch(setAllMarketsTab(tab))}
              hideCounts={isLoading}
              items={[
                {
                  value: LenderAllMarketsTab.SELF_ONBOARD,
                  label: t("dashboard.markets.tables.other.selfOnboard"),
                  count: isWrongNetwork ? 0 : selfOnboardAmount,
                },
                {
                  value: LenderAllMarketsTab.MANUAL,
                  label: t("dashboard.markets.tables.other.manual"),
                  count: isWrongNetwork ? 0 : manualAmount,
                },
                {
                  value: LenderAllMarketsTab.TERMINATED,
                  label: t("dashboard.markets.tables.other.terminated"),
                  count: isWrongNetwork ? 0 : terminatedOtherAmount,
                },
                {
                  value: LenderAllMarketsTab.DEFAULTED,
                  label: t("defaultedMarkets.tab"),
                  count: isWrongNetwork ? 0 : defaultedTabCount,
                },
              ]}
            />
          </Box>

          <Box
            sx={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "20px",
              marginTop: "24px",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <MarketsFilterSelect
                placeholder={t("dashboard.markets.filters.assets")}
                options={
                  tokens?.map((token) => ({
                    id: token.address,
                    name: token.symbol,
                  })) ?? []
                }
                selected={marketAssets}
                setSelected={setMarketAssets}
              />
              <MarketsFilterSelect
                placeholder={t("dashboard.markets.filters.statuses")}
                options={marketStatusesMock}
                selected={marketStatuses}
                setSelected={setMarketStatuses}
              />
              <MarketsFilterSelect
                placeholder={t("dashboard.markets.filters.withdrawalCycle")}
                options={withdrawalCycleOptions}
                selected={marketWithdrawalCycles}
                setSelected={setMarketWithdrawalCycles}
              />
              {showComposableSwitch && (
                <ComposableOnlySwitch
                  checked={composableOnly}
                  onChange={setComposableOnly}
                />
              )}
            </Box>

            <FilterTextField
              value={marketSearch}
              setValue={setMarketSearch}
              placeholder={t("dashboard.markets.filters.name")}
              width="312px"
            />
          </Box>
        </Box>
      )}

      {isMobile && <LenderMarketsMobileHeader page="others" />}

      {isWrongNetwork && <WrongNetworkAlert />}

      {!isWrongNetwork && (
        <OtherMarketsTable
          marketAccounts={filteredMarketAccounts}
          onboardingByMarket={onboardingByMarket}
          borrowers={borrowers ?? []}
          isLoading={isLoading}
          filters={filters}
          destinations={destinations}
          mobileHeader={
            <MobileMarketsToolbar
              variant="page"
              left={
                showComposableSwitch && (
                  <ComposableOnlySwitch
                    checked={composableOnly}
                    onChange={setComposableOnly}
                  />
                )
              }
              right={
                <>
                  <MobileFilterButton
                    size={28}
                    assetsOptions={
                      tokens?.map((token) => ({
                        id: token.address,
                        name: token.symbol,
                      })) ?? []
                    }
                    statusesOptions={marketStatusesMock}
                    withdrawalCycleOptions={withdrawalCycleOptions}
                    marketAssets={marketAssets}
                    marketStatuses={marketStatuses}
                    marketWithdrawalCycles={marketWithdrawalCycles}
                    setMarketAssets={setMarketAssets}
                    setMarketStatuses={setMarketStatuses}
                    setMarketWithdrawalCycles={setMarketWithdrawalCycles}
                  />
                  <MobileSearchButton
                    marketAccounts={filteredMarketAccounts ?? []}
                    marketSearch={marketSearch}
                    setMarketSearch={setMarketSearch}
                  />
                </>
              }
            />
          }
        />
      )}
    </Box>
  )
}
