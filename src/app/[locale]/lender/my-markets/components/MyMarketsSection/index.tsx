"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"

import { Box, Skeleton, Typography } from "@mui/material"
import { LenderRole, MarketAccount } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

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
import {
  LenderMyMarketsTab,
  setMyMarketsTab,
} from "@/store/slices/lenderDashboardSlice/lenderDashboardSlice"
import { setMarketFilters } from "@/store/slices/marketFiltersSlice/marketFiltersSlice"
import { COLORS } from "@/theme/colors"
import { EXCLUDED_MARKETS } from "@/utils/constants"
import { filterMarketAccounts } from "@/utils/filters"
import { MarketStatus } from "@/utils/marketStatus"

import { ActiveMarketsTables } from "../MarketsTables/ActiveMarketsTables"
import { TerminatedMarketsTables } from "../MarketsTables/TerminatedMarketsTables"

const withdrawalCycleOptions = [
  { id: "0-86400", name: "≤ 24h" },
  { id: "86401-259200", name: "1 - 3 days" },
  { id: "259201-604800", name: "3 - 7 days" },
  { id: "604801-Infinity", name: "7+ days" },
]

export const MyMarketsSection = () => {
  const isMobile = useMobileResolution()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const dispatch = useAppDispatch()
  const { t } = useTranslation()
  const {
    isWrongNetwork,
    chainId: targetChainId,
    targetChainId: selectedChainId,
    isTestnet,
  } = useCurrentNetwork()

  const destinations = useDestinations(selectedChainId)
  const { markets: destinationsByMarket } = destinations

  const {
    marketAccounts,
    isLoadingInitial,
    borrowers,
    policyMarkets,
    isPolicyMarketsLoading,
  } = useLenderMarketsContext()

  const myMarketsTab = useAppSelector(
    (state) => state.lenderDashboard.myMarketsTab,
  )

  const depositedCount = useAppSelector(
    (state) => state.lenderDashboardAmounts.deposited,
  )
  const nonDepositedCount = useAppSelector(
    (state) => state.lenderDashboardAmounts.nonDeposited,
  )
  const prevActiveCount = useAppSelector(
    (state) => state.lenderDashboardAmounts.prevActive,
  )
  const neverActiveCount = useAppSelector(
    (state) => state.lenderDashboardAmounts.neverActive,
  )

  const marketFilters = useAppSelector((s) => s.marketFilters.lender)
  const {
    search: marketSearch,
    assets: marketAssets,
    statuses: marketStatuses,
    withdrawalCycles: marketWithdrawalCycles,
    composableOnly,
  } = marketFilters

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
    }),
    [marketSearch, marketAssets, marketStatuses, marketWithdrawalCycles],
  )

  // Markets the lender has ever interacted with, or holds access to through a
  // policy, excluding blacklisted addresses. A policy grant writes no
  // LenderAccount row and no role for the market, so hasEverInteracted alone
  // would drop it, and the Non-Deposited and Never Active sections below would
  // have nothing to show.
  const myMarketAccounts = useMemo(
    () =>
      marketAccounts
        .filter(
          (account) =>
            !EXCLUDED_MARKETS.includes(account.market.address.toLowerCase()) ||
            account.isAuthorizedOnController ||
            account.role !== LenderRole.Null,
        )
        .filter(
          (account) =>
            account.hasEverInteracted ||
            policyMarkets.has(account.market.address.toLowerCase()),
        ),
    [marketAccounts, policyMarkets],
  )

  const filteredMarketAccounts = useMemo(
    () =>
      filterMarketAccounts(
        myMarketAccounts,
        marketSearch,
        marketStatuses,
        marketAssets,
        borrowers,
        marketWithdrawalCycles,
      ),
    [
      myMarketAccounts,
      marketSearch,
      marketStatuses,
      marketAssets,
      borrowers,
      marketWithdrawalCycles,
    ],
  )

  const composableMarketAccounts = useMemo(
    () =>
      filteredMarketAccounts.filter(
        (account) =>
          (destinationsByMarket[account.market.address.toLowerCase()]?.length ??
            0) > 0,
      ),
    [filteredMarketAccounts, destinationsByMarket],
  )

  const composableCount = composableMarketAccounts.length
  const isLoading =
    isLoadingInitial ||
    (isPolicyMarketsLoading && myMarketAccounts.length === 0) ||
    (composableOnly && destinations.isPending)
  const showComposableSwitch = composableCount > 0 || composableOnly

  const visibleMarketAccounts = composableOnly
    ? composableMarketAccounts
    : filteredMarketAccounts

  const {
    active: filteredActiveMarkets,
    terminated: filteredTerminatedMarkets,
  } = useMemo(
    () =>
      visibleMarketAccounts.reduce(
        (all, account) => {
          if (!account.market.isClosed) {
            all.active.push(account)
          } else {
            all.terminated.push(account)
          }
          return all
        },
        {
          active: [] as MarketAccount[],
          terminated: [] as MarketAccount[],
        },
      ),
    [visibleMarketAccounts],
  )

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

  const showActiveTables = myMarketsTab !== LenderMyMarketsTab.TERMINATED
  const showTerminatedTables = myMarketsTab === LenderMyMarketsTab.TERMINATED

  const mobileToolbar = (
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
            marketAccounts={visibleMarketAccounts}
            marketSearch={marketSearch}
            setMarketSearch={setMarketSearch}
          />
        </>
      }
    />
  )

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
    <Box sx={{ overflow: { xs: "auto", md: "visible" } }}>
      {/* Mobile Version */}
      {isMobile && <LenderMarketsMobileHeader page="yours" />}

      {/* Desktop Version */}
      {!isMobile && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            padding: "20px 16px 0",
          }}
        >
          <Typography variant="title3" color={COLORS.blackRock}>
            {t("dashboard.markets.tables.borrower.active.title")}
          </Typography>

          <Box sx={{ marginTop: "16px" }}>
            <MarketsTabs
              value={myMarketsTab}
              onChange={(tab) => dispatch(setMyMarketsTab(tab))}
              hideCounts={isLoading}
              items={[
                {
                  value: LenderMyMarketsTab.DEPOSITED,
                  label: t(
                    "dashboard.markets.tables.borrower.active.deposited",
                  ),
                  count: isWrongNetwork ? 0 : depositedCount,
                },
                {
                  value: LenderMyMarketsTab.NON_DEPOSITED,
                  label: t(
                    "dashboard.markets.tables.borrower.active.nonDeposited",
                  ),
                  count: isWrongNetwork ? 0 : nonDepositedCount,
                },
                {
                  value: LenderMyMarketsTab.TERMINATED,
                  label: t("dashboard.markets.tables.other.terminated"),
                  count: isWrongNetwork
                    ? 0
                    : prevActiveCount + neverActiveCount,
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
            <Box sx={{ display: "flex", gap: "6px", alignItems: "center" }}>
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
      {isWrongNetwork && <WrongNetworkAlert />}
      {!isWrongNetwork && showActiveTables && (
        <ActiveMarketsTables
          tab={myMarketsTab}
          marketAccounts={filteredActiveMarkets}
          borrowers={borrowers ?? []}
          isLoading={isLoading}
          destinations={destinations}
          composableOnly={composableOnly}
          filters={filters}
          mobileHeader={mobileToolbar}
        />
      )}
      {!isWrongNetwork && showTerminatedTables && (
        <TerminatedMarketsTables
          marketAccounts={filteredTerminatedMarkets}
          borrowers={borrowers ?? []}
          isLoading={isLoading}
          destinations={destinations}
          composableOnly={composableOnly}
          filters={filters}
          mobileHeader={mobileToolbar}
        />
      )}
    </Box>
  )
}
