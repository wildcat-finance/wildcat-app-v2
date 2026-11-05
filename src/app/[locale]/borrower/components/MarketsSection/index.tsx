import React, { useEffect, useMemo, useCallback, useState } from "react"

import { Box, Button, Skeleton, Typography } from "@mui/material"
import { MarketAccount } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { BorrowerActiveMarketsTables } from "@/app/[locale]/borrower/components/MarketsSection/сomponents/MarketsTables/BorrowerActiveMarketsTables"
import { BorrowerTerminatedMarketsTables } from "@/app/[locale]/borrower/components/MarketsSection/сomponents/MarketsTables/BorrowerTerminatedMarketsTables"
import { OtherMarketsTables } from "@/app/[locale]/borrower/components/MarketsSection/сomponents/MarketsTables/OtherMarketsTables"
import { useBorrowerInvitationRedirect } from "@/app/[locale]/borrower/hooks/useBorrowerInvitationRedirect"
import { useLendersMarkets } from "@/app/[locale]/lender/hooks/useLendersMarkets"
import { DefaultedPositionsHeading } from "@/components/DefaultedPositionsHeading"
import { FilterTextField } from "@/components/FilterTextfield"
import { MarketsFilterSelect } from "@/components/MarketsFilterSelect"
import { MarketsFilterSelectItem } from "@/components/MarketsFilterSelect/interface"
import { MarketsTabs } from "@/components/MarketsTabs"
import { MarketsTabItem } from "@/components/MarketsTabs/interface"
import { WrongNetworkAlert } from "@/components/WrongNetworkAlert"
import { useAllTokensWithMarkets } from "@/hooks/useAllTokensWithMarkets"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useDefaultedMarkets } from "@/hooks/useDefaultedMarkets"
import { marketStatusesMock } from "@/mocks/mocks"
import { ROUTES } from "@/routes"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setSectionAmount } from "@/store/slices/borrowerDashboardAmountsSlice/borrowerDashboardAmountsSlice"
import {
  BorrowerMarketDashboardSections,
  BorrowerMarketDashboardTabs,
  resolveMarketTab,
  setMarketTab,
} from "@/store/slices/borrowerDashboardSlice/borrowerDashboardSlice"
import { setMarketFilters } from "@/store/slices/marketFiltersSlice/marketFiltersSlice"
import { COLORS } from "@/theme/colors"
import { filterMarketAccounts } from "@/utils/filters"
import {
  getKnownMarketOnboardingMode,
  MarketOnboardingMode,
} from "@/utils/marketOnboarding"
import { MarketStatus } from "@/utils/marketStatus"

import { LeadBanner } from "../../../../../components/LeadBanner"
import { useBorrowerNames } from "../../hooks/useBorrowerNames"

export const MarketsSection = () => {
  const dispatch = useAppDispatch()
  const { isTestnet } = useAppSelector((state) => state.selectedNetwork)
  const [mounted, setMounted] = useState(false)

  const marketSection = useAppSelector(
    (state) => state.borrowerDashboard.marketSection,
  )

  const storedMarketTab = useAppSelector(
    (state) => state.borrowerDashboard.marketTab,
  )

  const sectionAmounts = useAppSelector(
    (state) => state.borrowerDashboardAmounts,
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
          setMarketFilters({ role: "borrower", filters: { search: next } }),
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
      dispatch(
        setMarketFilters({ role: "borrower", filters: { assets: next } }),
      )
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
        setMarketFilters({ role: "borrower", filters: { statuses: next } }),
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
          role: "borrower",
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
  // tables use this derived object; stable and only changes when inputs change

  const { t } = useTranslation()

  const withdrawalCycleOptions = [
    { id: "0-86400", name: "≤ 24h" },
    { id: "86401-259200", name: "1 - 3 days" },
    { id: "259201-604800", name: "3 - 7 days" },
    { id: "604801-Infinity", name: "7+ days" },
  ]

  const { address } = useAccount()
  const { isWrongNetwork } = useCurrentNetwork()
  const { data: borrowers } = useBorrowerNames()

  const bannerDisplayConfig = useBorrowerInvitationRedirect()

  useEffect(() => {
    setMounted(true)
  }, [])

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
    onboardingByMarket,
  } = useLendersMarkets()

  const isLoading = isLoadingInitial || isLoadingUpdate

  const {
    isLoading: isLoadingDefaults,
    isError: isDefaultsError,
    isDefaulted,
  } = useDefaultedMarkets()

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
        marketWithdrawalCycles,
      ),
    [
      marketAccounts,
      marketSearch,
      marketStatuses,
      marketAssets,
      borrowers,
      address,
      marketWithdrawalCycles,
    ],
  )

  const {
    defaulted: filteredDefaultedBorrowerMarkets,
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
            if (isDefaulted(account.market.address)) {
              all.defaulted.push(account)
            } else if (!account.market.isClosed) {
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
          defaulted: [] as MarketAccount[],
          active: [] as MarketAccount[],
          terminated: [] as MarketAccount[],
          other: [] as MarketAccount[],
        },
      ),
    [filteredMarketAccounts, address, isDefaulted],
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

  const defaultedMarketsAmount = borrowerMarkets.filter((account) =>
    isDefaulted(account.market.address),
  ).length

  const liveBorrowerMarkets = borrowerMarkets.filter(
    (account) => !isDefaulted(account.market.address),
  )

  const liveOthersMarkets = othersMarkets.filter(
    (account) => !isDefaulted(account.market.address),
  )

  const depositedMarketsAmount = liveBorrowerMarkets.filter((account) => {
    const { borrowed } = account.market.getTotalDebtBreakdown()
    return (
      !account.market.isClosed &&
      (!account.market.borrowableAssets.raw.isZero() || !borrowed.raw.isZero())
    )
  }).length

  const nonDepositedMarketsAmount = liveBorrowerMarkets.filter((account) => {
    const { borrowed } = account.market.getTotalDebtBreakdown()
    return (
      account.market.borrowableAssets.raw.isZero() &&
      borrowed.raw.isZero() &&
      !account.market.isClosed &&
      !account.market.isIncurringPenalties &&
      !account.market.isDelinquent
    )
  }).length

  const prevActiveAmount = liveBorrowerMarkets.filter(
    (account) => account.market.isClosed && account.hasEverInteracted,
  ).length

  const neverActiveAmount = liveBorrowerMarkets.filter(
    (account) => account.market.isClosed && !account.hasEverInteracted,
  ).length

  const selfOnboardAmount = liveOthersMarkets.filter(
    (account) =>
      !account.market.isClosed &&
      getKnownMarketOnboardingMode(
        account.market.version,
        account.market.address,
        onboardingByMarket,
      ) === MarketOnboardingMode.SelfOnboard,
  ).length

  const manualAmount = liveOthersMarkets.filter(
    (account) =>
      !account.market.isClosed &&
      getKnownMarketOnboardingMode(
        account.market.version,
        account.market.address,
        onboardingByMarket,
      ) === MarketOnboardingMode.BorrowerApproval,
  ).length

  const terminatedOtherAmount = liveOthersMarkets.filter(
    (account) => account.market.isClosed,
  ).length

  const defaultedOtherAmount = othersMarkets.filter((account) =>
    isDefaulted(account.market.address),
  ).length

  useEffect(() => {
    dispatch(
      setSectionAmount({
        name: "defaulted",
        value: isWrongNetwork ? 0 : defaultedMarketsAmount,
      }),
    )
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
    dispatch(
      setSectionAmount({
        name: "terminatedOther",
        value: isWrongNetwork ? 0 : terminatedOtherAmount,
      }),
    )
    dispatch(
      setSectionAmount({
        name: "defaultedOther",
        value: isWrongNetwork ? 0 : defaultedOtherAmount,
      }),
    )
  }, [
    defaultedMarketsAmount,
    depositedMarketsAmount,
    nonDepositedMarketsAmount,
    prevActiveAmount,
    neverActiveAmount,
    selfOnboardAmount,
    manualAmount,
    terminatedOtherAmount,
    defaultedOtherAmount,
    isWrongNetwork,
    dispatch,
  ])

  const showDefaultedTab = !isLoadingDefaults && defaultedMarketsAmount > 0
  const marketTab = resolveMarketTab(storedMarketTab, showDefaultedTab)

  useEffect(() => {
    if (
      storedMarketTab === BorrowerMarketDashboardTabs.DEFAULTED &&
      !isLoadingDefaults &&
      !isLoadingInitial &&
      !showDefaultedTab
    ) {
      dispatch(setMarketTab(BorrowerMarketDashboardTabs.DEPOSITED))
    }
  }, [
    storedMarketTab,
    isLoadingDefaults,
    isLoadingInitial,
    showDefaultedTab,
    dispatch,
  ])

  const showYourMarkets =
    showFullFunctionality && !noMarkets && mounted && !isWrongNetwork
  const showOtherMarkets = mounted && !isWrongNetwork

  const isYourSection = marketSection === BorrowerMarketDashboardSections.YOUR

  const tabItems: MarketsTabItem<BorrowerMarketDashboardTabs>[] = isYourSection
    ? [
        ...(showDefaultedTab
          ? [
              {
                value: BorrowerMarketDashboardTabs.DEFAULTED,
                label: t("defaultedMarkets.tab"),
                count: defaultedMarketsAmount,
              },
            ]
          : []),
        {
          value: BorrowerMarketDashboardTabs.DEPOSITED,
          label: t("dashboard.markets.tables.borrower.active.deposited"),
          count: sectionAmounts.deposited,
        },
        {
          value: BorrowerMarketDashboardTabs.NON_DEPOSITED,
          label: t("dashboard.markets.tables.borrower.active.nonDeposited"),
          count: sectionAmounts.nonDeposited,
        },
        {
          value: BorrowerMarketDashboardTabs.TERMINATED,
          label: t("dashboard.markets.tables.other.terminated"),
          count: sectionAmounts.prevActive + sectionAmounts.neverActive,
        },
      ]
    : [
        {
          value: BorrowerMarketDashboardTabs.SELF_ONBOARD,
          label: t("dashboard.markets.tables.other.selfOnboard"),
          count: sectionAmounts.selfOnboard,
        },
        {
          value: BorrowerMarketDashboardTabs.MANUAL,
          label: t("dashboard.markets.tables.other.manual"),
          count: sectionAmounts.manual,
        },
        {
          value: BorrowerMarketDashboardTabs.OTHER_TERMINATED,
          label: t("dashboard.markets.tables.other.terminated"),
          count: sectionAmounts.terminatedOther,
        },
        {
          value: BorrowerMarketDashboardTabs.OTHER_DEFAULTED,
          label: t("defaultedMarkets.tab"),
          count:
            isLoadingDefaults || isDefaultsError
              ? undefined
              : sectionAmounts.defaultedOther,
        },
      ]

  const showTabs = isYourSection ? showYourMarkets : showOtherMarkets

  const handleChangeMarketTab = (tab: BorrowerMarketDashboardTabs) => {
    dispatch(setMarketTab(tab))
  }

  return (
    <Box
      sx={{
        width: "100%",
        flex: "1 1 0",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            width: "100%",
            minHeight: "40px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            padding: "0 24px",
          }}
        >
          <Typography variant="title2" color={COLORS.bunker}>
            {t("dashboard.markets.title")}
          </Typography>
          {!bannerDisplayConfig.hideCreateMarket && (
            <Link
              href={ROUTES.borrower.createMarket}
              style={{
                display: "flex",
                marginTop: "4px",
                textDecoration: "none",
              }}
            >
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

        {showTabs && (
          <Box sx={{ marginTop: "16px", padding: "0 16px" }}>
            {isYourSection && isLoadingDefaults ? (
              <Skeleton
                height="28px"
                width="100%"
                sx={{ bgcolor: COLORS.athensGrey }}
              />
            ) : (
              <MarketsTabs
                value={marketTab}
                items={tabItems}
                onChange={handleChangeMarketTab}
                hideCounts={isLoadingInitial || isLoadingDefaults}
              />
            )}
          </Box>
        )}

        {showTabs && marketTab === BorrowerMarketDashboardTabs.DEFAULTED && (
          <DefaultedPositionsHeading
            sx={{ marginTop: "32px", padding: "0 16px" }}
          />
        )}

        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            padding: "0 16px",
            marginTop: showTabs ? "24px" : "16px",
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
              placeholder={t("dashboard.markets.filters.withdrawalCycle")}
              options={withdrawalCycleOptions}
              selected={marketWithdrawalCycles}
              setSelected={setMarketWithdrawalCycles}
            />
          </Box>

          <FilterTextField
            value={marketSearch}
            setValue={setMarketSearch}
            placeholder={t("dashboard.markets.filters.name")}
            width="312px"
          />
        </Box>
      </Box>

      {!bannerDisplayConfig.hideBanner && isYourSection && (
        <Box padding="24px 16px 0">
          <LeadBanner
            title={bannerDisplayConfig.title}
            subtitle={bannerDisplayConfig.message}
            buttonText={bannerDisplayConfig.button}
            buttonLink={bannerDisplayConfig.link}
          />
        </Box>
      )}

      {showYourMarkets &&
        marketTab === BorrowerMarketDashboardTabs.DEFAULTED && (
          <BorrowerActiveMarketsTables
            tab={marketTab}
            marketAccounts={filteredDefaultedBorrowerMarkets}
            isLoading={isLoading || isLoadingDefaults}
            filters={filters}
          />
        )}

      {showYourMarkets &&
        (marketTab === BorrowerMarketDashboardTabs.DEPOSITED ||
          marketTab === BorrowerMarketDashboardTabs.NON_DEPOSITED) && (
          <BorrowerActiveMarketsTables
            tab={marketTab}
            marketAccounts={filteredActiveBorrowerMarkets}
            isLoading={isLoading || isLoadingDefaults}
            filters={filters}
          />
        )}

      {showYourMarkets &&
        marketTab === BorrowerMarketDashboardTabs.TERMINATED && (
          <BorrowerTerminatedMarketsTables
            marketAccounts={filteredTerminatedBorrowerMarkets}
            isLoading={isLoading || isLoadingDefaults}
            filters={filters}
          />
        )}

      {showOtherMarkets &&
        (marketTab === BorrowerMarketDashboardTabs.SELF_ONBOARD ||
          marketTab === BorrowerMarketDashboardTabs.MANUAL ||
          marketTab === BorrowerMarketDashboardTabs.OTHER_TERMINATED ||
          marketTab === BorrowerMarketDashboardTabs.OTHER_DEFAULTED) && (
          <OtherMarketsTables
            tab={marketTab}
            marketAccounts={filteredOtherMarketAccounts}
            onboardingByMarket={onboardingByMarket}
            isLoading={isLoading || isLoadingDefaults}
            filters={filters}
          />
        )}

      {mounted && isWrongNetwork && <WrongNetworkAlert />}
    </Box>
  )
}
