import React, { useEffect, useMemo, useState, useCallback } from "react"

import { Box, Button, Typography } from "@mui/material"
import {
  DepositStatus,
  MarketAccount,
  MarketVersion,
  SupportedChainId,
} from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { MarketSectionSwitcher } from "@/app/[locale]/borrower/components/MarketsSection/сomponents/MarketSectionSwitcher"
import { BorrowerActiveMarketsTables } from "@/app/[locale]/borrower/components/MarketsSection/сomponents/MarketsTables/BorrowerActiveMarketsTables"
import { BorrowerTerminatedMarketsTables } from "@/app/[locale]/borrower/components/MarketsSection/сomponents/MarketsTables/BorrowerTerminatedMarketsTables"
import { OtherMarketsTables } from "@/app/[locale]/borrower/components/MarketsSection/сomponents/MarketsTables/OtherMarketsTables"
import { useBorrowerInvitationRedirect } from "@/app/[locale]/borrower/hooks/useBorrowerInvitationRedirect"
import { useLendersMarkets } from "@/app/[locale]/lender/hooks/useLendersMarkets"
import { FilterTextField } from "@/components/FilterTextfield"
import { LeadBanner } from "@/components/LeadBanner"
import {
  SmallFilterSelect,
  SmallFilterSelectItem,
} from "@/components/SmallFilterSelect"
import { WrongNetworkAlert } from "@/components/WrongNetworkAlert"
import { useAllTokensWithMarkets } from "@/hooks/useAllTokensWithMarkets"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { marketStatusesMock } from "@/mocks/mocks"
import { ROUTES } from "@/routes"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setSectionAmount } from "@/store/slices/borrowerDashboardAmountsSlice/borrowerDashboardAmountsSlice"
import { BorrowerMarketDashboardSections } from "@/store/slices/borrowerDashboardSlice/borrowerDashboardSlice"
import { setMarketFilters } from "@/store/slices/marketFiltersSlice/marketFiltersSlice"
import { COLORS } from "@/theme/colors"
import { filterMarketAccounts } from "@/utils/filters"
import { MarketStatus } from "@/utils/marketStatus"

import { useBorrowerNames } from "../../hooks/useBorrowerNames"

export const MarketsSection = () => {
  const dispatch = useAppDispatch()
  const { isTestnet } = useAppSelector((state) => state.selectedNetwork)

  const marketSection = useAppSelector(
    (state) => state.borrowerDashboard.marketSection,
  )

  const showFullFunctionality = useAppSelector(
    (state) => state.borrowerDashboard.showFullFunctionality,
  )

  // filter state lives in redux now
  const marketFilters = useAppSelector((s) => s.marketFilters.borrower)
  const {
    search: marketSearch,
    assets: marketAssets,
    statuses: marketStatuses,
  } = marketFilters

  const setMarketSearch: React.Dispatch<React.SetStateAction<string>> =
    useCallback(
      (value) => {
        const next =
          typeof value === "function"
            ? (value as (prev: string) => string)(marketSearch)
            : value
        dispatch(
          setMarketFilters({ role: "borrower", filters: { search: next } }),
        )
      },
      [dispatch, marketSearch],
    )

  const setMarketAssets: React.Dispatch<
    React.SetStateAction<SmallFilterSelectItem[]>
  > = useCallback(
    (value) => {
      const next =
        typeof value === "function"
          ? (
              value as (
                prev: SmallFilterSelectItem[],
              ) => SmallFilterSelectItem[]
            )(marketAssets)
          : value
      dispatch(
        setMarketFilters({ role: "borrower", filters: { assets: next } }),
      )
    },
    [dispatch, marketAssets],
  )

  const setMarketStatuses: React.Dispatch<
    React.SetStateAction<SmallFilterSelectItem[]>
  > = useCallback(
    (value) => {
      const next =
        typeof value === "function"
          ? (
              value as (
                prev: SmallFilterSelectItem[],
              ) => SmallFilterSelectItem[]
            )(marketStatuses)
          : value
      dispatch(
        setMarketFilters({ role: "borrower", filters: { statuses: next } }),
      )
    },
    [dispatch, marketStatuses],
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
  // tables use this derived object; stable and only changes when inputs change

  const { t } = useTranslation()

  const { address } = useAccount()
  const { isWrongNetwork } = useCurrentNetwork()
  const { data: borrowers } = useBorrowerNames()

  const bannerDisplayConfig = useBorrowerInvitationRedirect()

  const { data: tokensRaw } = useAllTokensWithMarkets()
  const tokens = useMemo(() => {
    if (isTestnet) {
      /// Only take first token with a given symbol
      return tokensRaw?.filter(
        (token, index, self) =>
          index === self.findIndex((x) => x.symbol === token.symbol),
      )
    }
    return tokensRaw
  }, [tokensRaw])

  const {
    data: marketAccounts,
    isLoadingInitial,
    isLoadingUpdate,
  } = useLendersMarkets()

  const isLoading = isLoadingInitial || isLoadingUpdate

  const borrowerMarketAccounts = marketAccounts.filter(
    (account) =>
      account.market.borrower.toLowerCase() === address?.toLowerCase(),
  )

  const filteredMarketAccounts = useMemo(
    () =>
      filterMarketAccounts(
        marketAccounts,
        marketSearch,
        marketStatuses,
        marketAssets,
        borrowers,
      ),
    [
      marketAccounts,
      marketSearch,
      marketStatuses,
      marketAssets,
      borrowers,
      address,
    ],
  )

  const {
    active: filteredActiveBorrowerMarkets,
    terminated: filteredTerminatedBorrowerMarkets,
    other: filteredOtherMarketAccounts,
  } = useMemo(
    () =>
      filteredMarketAccounts.reduce(
        (all, account) => {
          if (
            account.market.borrower.toLowerCase() === address?.toLowerCase()
          ) {
            if (!account.market.isClosed) {
              all.active.push(account)
            } else {
              all.terminated.push(account)
            }
          } else {
            all.other.push(account)
          }

          return all
        },
        {
          active: [] as MarketAccount[],
          terminated: [] as MarketAccount[],
          other: [] as MarketAccount[],
        },
      ),
    [filteredMarketAccounts, address],
  )

  const noMarkets = borrowerMarketAccounts.length === 0

  const borrowerMarkets = marketAccounts.filter(
    (account) =>
      account.market.borrower.toLowerCase() === address?.toLowerCase(),
  )

  const othersMarkets = marketAccounts.filter(
    (account) =>
      account.market.borrower.toLowerCase() !== address?.toLowerCase(),
  )

  const depositedMarketsAmount = borrowerMarkets.filter(
    (account) =>
      !account.market.isClosed &&
      (!account.market.borrowableAssets.raw.isZero() ||
        !account.market.totalBorrowed?.raw.isZero()),
  ).length

  const nonDepositedMarketsAmount = borrowerMarkets.filter(
    (account) =>
      account.market.borrowableAssets.raw.isZero() &&
      account.market.totalBorrowed?.raw.isZero() &&
      !account.market.isClosed &&
      !account.market.isIncurringPenalties &&
      !account.market.isDelinquent,
  ).length

  const prevActiveAmount = borrowerMarkets.filter(
    (account) => account.market.isClosed && account.hasEverInteracted,
  ).length

  const neverActiveAmount = borrowerMarkets.filter(
    (account) => account.market.isClosed && !account.hasEverInteracted,
  ).length

  const selfOnboardAmount = othersMarkets.filter(
    (account) =>
      !account.hasEverInteracted &&
      account.market.version === MarketVersion.V2 &&
      account.depositAvailability === DepositStatus.Ready,
  ).length

  const manualAmount = othersMarkets.length - selfOnboardAmount

  useEffect(() => {
    dispatch(
      setSectionAmount({
        name: "deposited",
        value: isWrongNetwork ? 0 : depositedMarketsAmount,
      }),
    )
    dispatch(
      setSectionAmount({
        name: "nonDeposited",
        value: isWrongNetwork ? 0 : nonDepositedMarketsAmount,
      }),
    )
    dispatch(
      setSectionAmount({
        name: "prevActive",
        value: isWrongNetwork ? 0 : prevActiveAmount,
      }),
    )
    dispatch(
      setSectionAmount({
        name: "neverActive",
        value: isWrongNetwork ? 0 : neverActiveAmount,
      }),
    )
    dispatch(
      setSectionAmount({
        name: "selfOnboard",
        value: isWrongNetwork ? 0 : selfOnboardAmount,
      }),
    )
    dispatch(
      setSectionAmount({
        name: "manual",
        value: isWrongNetwork ? 0 : manualAmount,
      }),
    )
  }, [
    depositedMarketsAmount,
    nonDepositedMarketsAmount,
    prevActiveAmount,
    neverActiveAmount,
    selfOnboardAmount,
    manualAmount,
    isWrongNetwork,
    dispatch,
  ])

  return (
    <Box
      sx={{
        width: "100%",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          padding: "0 24px",
        }}
      >
        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="title2" sx={{ marginBottom: "6px" }}>
            {t("dashboard.markets.title")}
          </Typography>
          {!bannerDisplayConfig.hideCreateMarket && (
            <Link href={ROUTES.borrower.createMarket}>
              <Button
                variant="contained"
                size="small"
                disabled={isWrongNetwork}
                sx={{
                  paddingTop: "8px",
                  paddingBottom: "8px",
                  minWidth: "100px",
                }}
              >
                {t("dashboard.markets.borrowerTitleButton")}
              </Button>
            </Link>
          )}
        </Box>
        <Typography
          variant="text3"
          color={COLORS.santasGrey}
          sx={{ marginBottom: "24px" }}
        >
          {t("dashboard.markets.borrowerSubtitle")}{" "}
          <Link
            href="https://docs.wildcat.finance/using-wildcat/day-to-day-usage/borrowers"
            style={{ color: COLORS.santasGrey }}
            target="_blank"
          >
            {t("dashboard.markets.docsLink")}
          </Link>
        </Typography>

        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <MarketSectionSwitcher />

          <Box sx={{ width: "fit-content", display: "flex", gap: "6px" }}>
            <FilterTextField
              value={marketSearch}
              setValue={setMarketSearch}
              placeholder={t("dashboard.markets.filters.name")}
              width="180px"
            />

            <SmallFilterSelect
              placeholder={t("dashboard.markets.filters.assets")}
              options={
                tokens?.map((token) => ({
                  id: token.address,
                  name: token.symbol,
                })) ?? []
              }
              selected={marketAssets}
              setSelected={setMarketAssets}
              width="180px"
            />

            <SmallFilterSelect
              placeholder={t("dashboard.markets.filters.statuses")}
              options={marketStatusesMock}
              selected={marketStatuses}
              setSelected={setMarketStatuses}
              width="180px"
            />
          </Box>
        </Box>
      </Box>

      {!bannerDisplayConfig.hideBanner &&
        !(marketSection === BorrowerMarketDashboardSections.OTHER) && (
          <Box padding="24px 24px 0">
            <LeadBanner
              title={bannerDisplayConfig.title}
              text={bannerDisplayConfig.message}
              buttonText={bannerDisplayConfig.button}
              buttonLink={bannerDisplayConfig.link}
            />
          </Box>
        )}

      {marketSection === BorrowerMarketDashboardSections.ACTIVE &&
        showFullFunctionality &&
        !noMarkets &&
        !isWrongNetwork && (
          <BorrowerActiveMarketsTables
            marketAccounts={filteredActiveBorrowerMarkets}
            isLoading={isLoading}
            filters={filters}
          />
        )}

      {marketSection === BorrowerMarketDashboardSections.TERMINATED &&
        showFullFunctionality &&
        !noMarkets &&
        !isWrongNetwork && (
          <BorrowerTerminatedMarketsTables
            marketAccounts={filteredTerminatedBorrowerMarkets}
            isLoading={isLoading}
            filters={filters}
          />
        )}

      {marketSection === BorrowerMarketDashboardSections.OTHER &&
        !isWrongNetwork && (
          <OtherMarketsTables
            marketAccounts={filteredOtherMarketAccounts}
            isLoading={isLoading}
            filters={filters}
          />
        )}

      {isWrongNetwork && <WrongNetworkAlert />}
    </Box>
  )
}
