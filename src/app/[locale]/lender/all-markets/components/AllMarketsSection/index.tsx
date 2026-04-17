"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"

import { Box, Divider, Skeleton, Typography } from "@mui/material"
import { DepositStatus, MarketVersion } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { useLenderMarketsContext } from "@/app/[locale]/lender/context"
import { FilterTextField } from "@/components/FilterTextfield"
import { MarketsFilterSelect } from "@/components/MarketsFilterSelect"
import { MarketsFilterSelectItem } from "@/components/MarketsFilterSelect/interface"
import { MobileFilterButton } from "@/components/Mobile/MobileFilterButton"
import { MobileSearchButton } from "@/components/Mobile/MobileSearchButton"
import { WrongNetworkAlert } from "@/components/WrongNetworkAlert"
import { useAllTokensWithMarkets } from "@/hooks/useAllTokensWithMarkets"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { marketStatusesMock } from "@/mocks/mocks"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setLendersSectionAmount } from "@/store/slices/lenderDashboardAmountSlice/lenderDashboardAmountsSlice"
import { setMarketFilters } from "@/store/slices/marketFiltersSlice/marketFiltersSlice"
import { COLORS } from "@/theme/colors"
import { EXCLUDED_MARKETS } from "@/utils/constants"
import { filterMarketAccounts } from "@/utils/filters"
import { MarketStatus } from "@/utils/marketStatus"

import { OtherMarketsTable } from "../MarketsTables/OtherMarketsTable"
import { MobileHeader } from "../MobileHeader"

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
  const { t } = useTranslation()
  useAccount()
  const {
    isWrongNetwork,
    chainId: targetChainId,
    isTestnet,
  } = useCurrentNetwork()

  const { marketAccounts, isLoadingInitial, isLoadingUpdate, borrowers } =
    useLenderMarketsContext()

  const isLoading = isLoadingInitial || isLoadingUpdate

  const marketFilters = useAppSelector((s) => s.marketFilters.lender)
  const {
    search: marketSearch,
    assets: marketAssets,
    statuses: marketStatuses,
    withdrawalCycles: marketWithdrawalCycles,
  } = marketFilters

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
    }),
    [marketSearch, marketAssets, marketStatuses],
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

  const filteredMarketAccounts = useMemo(
    () =>
      filterMarketAccounts(
        otherMarketAccounts,
        marketSearch,
        marketStatuses,
        marketAssets,
        borrowers ?? [],
        marketWithdrawalCycles,
      ),
    [
      otherMarketAccounts,
      marketSearch,
      marketStatuses,
      marketAssets,
      borrowers,
      marketWithdrawalCycles,
    ],
  )

  const selfOnboardAmount = useMemo(
    () =>
      otherMarketAccounts.filter(
        (account) =>
          !account.market.isClosed &&
          account.market.version === MarketVersion.V2 &&
          account.depositAvailability === DepositStatus.Ready,
      ).length,
    [otherMarketAccounts],
  )

  const manualAmount = useMemo(
    () =>
      otherMarketAccounts.filter(
        (account) =>
          !account.market.isClosed &&
          !(
            account.market.version === MarketVersion.V2 &&
            account.depositAvailability === DepositStatus.Ready
          ),
      ).length,
    [otherMarketAccounts],
  )

  const terminatedOtherAmount = useMemo(
    () =>
      otherMarketAccounts.filter((account) => account.market.isClosed).length,
    [otherMarketAccounts],
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
        name: "allMarkets",
        value: isWrongNetwork
          ? 0
          : selfOnboardAmount + manualAmount + terminatedOtherAmount,
      }),
    )
  }, [
    selfOnboardAmount,
    manualAmount,
    terminatedOtherAmount,
    isWrongNetwork,
    dispatch,
  ])

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
          height: { xs: "153px", md: "162px" },
          borderRadius: "14px",
          backgroundColor: { xs: COLORS.white06, md: "transparent" },
        }}
      />
    )

  return (
    <Box sx={{ width: "100%" }}>
      {!isMobile && (
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <Box
            sx={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "24px 24px 0",
            }}
          >
            <Typography variant="title2" sx={{ marginBottom: "6px" }}>
              {t("dashboard.markets.title")}
            </Typography>
          </Box>

          <Typography
            variant="text3"
            color={COLORS.santasGrey}
            sx={{ marginBottom: "24px", padding: "0 24px" }}
          >
            {t("dashboard.markets.lenderSubtitle")}{" "}
            <Link
              href="https://docs.wildcat.finance/using-wildcat/day-to-day-usage/lenders"
              style={{ color: COLORS.santasGrey }}
              target="_blank"
              rel="noreferrer"
            >
              {t("dashboard.markets.docsLink")}
            </Link>
          </Typography>

          <Divider
            sx={{
              marginTop: "6px",
              borderColor: COLORS.athensGrey,
              width: "100%",
            }}
          />

          <Box
            sx={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              padding: "0 24px",
              marginTop: "16px",
            }}
          >
            <Box sx={{ display: "flex", gap: "6px" }}>
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
                placeholder="Withdrawal Cycle"
                options={withdrawalCycleOptions}
                selected={marketWithdrawalCycles}
                setSelected={setMarketWithdrawalCycles}
              />
            </Box>

            <FilterTextField
              value={marketSearch}
              setValue={setMarketSearch}
              placeholder={t("dashboard.markets.filters.name")}
              width="264px"
            />
          </Box>
        </Box>
      )}

      {isMobile && (
        <MobileHeader>
          <Box sx={{ display: "flex", gap: "4px" }}>
            <MobileFilterButton
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
          </Box>
        </MobileHeader>
      )}

      {isWrongNetwork && <WrongNetworkAlert />}

      {!isWrongNetwork && (
        <OtherMarketsTable
          marketAccounts={filteredMarketAccounts}
          borrowers={borrowers ?? []}
          isLoading={isLoading}
          filters={filters}
        />
      )}
    </Box>
  )
}
