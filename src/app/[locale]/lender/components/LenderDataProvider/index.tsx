"use client"

import { ReactNode, useEffect, useMemo } from "react"

import { LenderRole } from "@wildcatfi/wildcat-sdk"

import { useBorrowerNames } from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import { LenderMarketsContext } from "@/app/[locale]/lender/context"
import { useLenderPolicyMarkets } from "@/app/[locale]/lender/hooks/useLenderPolicyMarkets"
import { useLendersMarkets } from "@/app/[locale]/lender/hooks/useLendersMarkets"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useDefaultedMarkets } from "@/hooks/useDefaultedMarkets"
import { useAppDispatch } from "@/store/hooks"
import { setLendersSectionAmount } from "@/store/slices/lenderDashboardAmountSlice/lenderDashboardAmountsSlice"
import { EXCLUDED_MARKETS } from "@/utils/constants"

import { getAllMarketsAmounts } from "./allMarketsAmounts"

export const LenderDataProvider = ({ children }: { children: ReactNode }) => {
  const dispatch = useAppDispatch()
  const { isWrongNetwork } = useCurrentNetwork()

  const {
    data: marketAccounts,
    isLoadingInitial,
    isLoadingUpdate,
    onboardingByMarket,
    onboardingStatus,
  } = useLendersMarkets()

  const { data: borrowers } = useBorrowerNames()
  const {
    isLoading: isDefaultsLoading,
    isError: isDefaultsError,
    isDefaulted,
    defaultedMarketsOfBorrower,
  } = useDefaultedMarkets()
  const { policyMarkets, isPolicyMarketsLoading } =
    useLenderPolicyMarkets(marketAccounts)

  const lenderMarkets = useMemo(
    () =>
      marketAccounts
        .filter(
          (account) =>
            !EXCLUDED_MARKETS.includes(account.market.address.toLowerCase()) ||
            account.isAuthorizedOnController ||
            account.role !== LenderRole.Null,
        )
        .filter((account) => account.hasEverInteracted),
    [marketAccounts],
  )

  const othersMarkets = useMemo(
    () =>
      marketAccounts
        .filter(
          (account) =>
            !EXCLUDED_MARKETS.includes(account.market.address.toLowerCase()) ||
            account.isAuthorizedOnController ||
            account.role !== LenderRole.Null,
        )
        .filter((account) => !account.hasEverInteracted),
    [marketAccounts],
  )

  const policyOnlyMarkets = useMemo(
    () =>
      othersMarkets.filter((account) =>
        policyMarkets.has(account.market.address.toLowerCase()),
      ),
    [othersMarkets, policyMarkets],
  )

  const depositedMarketsAmount = useMemo(
    () =>
      lenderMarkets.filter(
        (market) =>
          !market.market.isClosed &&
          market.hasEverInteracted &&
          !isDefaulted(market.market.address),
      ).length,
    [lenderMarkets, isDefaulted],
  )

  const nonDepositedMarketsAmount = useMemo(
    () =>
      policyOnlyMarkets.filter(
        (market) =>
          !market.market.isClosed && !isDefaulted(market.market.address),
      ).length,
    [policyOnlyMarkets, isDefaulted],
  )

  const prevActiveAmount = useMemo(
    () =>
      lenderMarkets.filter(
        (market) =>
          market.market.isClosed &&
          market.hasEverInteracted &&
          !isDefaulted(market.market.address),
      ).length,
    [lenderMarkets, isDefaulted],
  )

  const neverActiveAmount = useMemo(
    () =>
      policyOnlyMarkets.filter(
        (market) =>
          market.market.isClosed && !isDefaulted(market.market.address),
      ).length,
    [policyOnlyMarkets, isDefaulted],
  )

  const defaultedAmount = useMemo(
    () =>
      [...lenderMarkets, ...policyOnlyMarkets].filter((account) =>
        isDefaulted(account.market.address),
      ).length,
    [lenderMarkets, policyOnlyMarkets, isDefaulted],
  )

  const {
    selfOnboard: selfOnboardAmount,
    manual: manualAmount,
    terminatedOther: terminatedOtherAmount,
    defaultedOther: defaultedOtherAmount,
  } = useMemo(
    () => getAllMarketsAmounts(othersMarkets, onboardingByMarket, isDefaulted),
    [othersMarkets, onboardingByMarket, isDefaulted],
  )

  useEffect(() => {
    dispatch(
      setLendersSectionAmount({
        name: "deposited",
        value: isWrongNetwork ? 0 : depositedMarketsAmount,
      }),
    )
    dispatch(
      setLendersSectionAmount({
        name: "nonDeposited",
        value: isWrongNetwork ? 0 : nonDepositedMarketsAmount,
      }),
    )
    dispatch(
      setLendersSectionAmount({
        name: "prevActive",
        value: isWrongNetwork ? 0 : prevActiveAmount,
      }),
    )
    dispatch(
      setLendersSectionAmount({
        name: "neverActive",
        value: isWrongNetwork ? 0 : neverActiveAmount,
      }),
    )
    dispatch(
      setLendersSectionAmount({
        name: "defaulted",
        value: isWrongNetwork ? 0 : defaultedAmount,
      }),
    )
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
        value: isWrongNetwork ? 0 : defaultedOtherAmount,
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
            defaultedOtherAmount,
      }),
    )
  }, [
    depositedMarketsAmount,
    nonDepositedMarketsAmount,
    prevActiveAmount,
    neverActiveAmount,
    defaultedAmount,
    selfOnboardAmount,
    manualAmount,
    terminatedOtherAmount,
    defaultedOtherAmount,
    isWrongNetwork,
    dispatch,
  ])

  const defaults = useMemo(
    () => ({
      isLoading: isDefaultsLoading,
      isError: isDefaultsError,
      isDefaulted,
      defaultedMarketsOfBorrower,
    }),
    [
      isDefaultsLoading,
      isDefaultsError,
      isDefaulted,
      defaultedMarketsOfBorrower,
    ],
  )

  const contextValue = useMemo(
    () => ({
      marketAccounts,
      isLoadingInitial,
      isLoadingUpdate,
      onboardingByMarket,
      onboardingStatus,
      borrowers,
      policyMarkets,
      isPolicyMarketsLoading,
      defaults,
    }),
    [
      marketAccounts,
      isLoadingInitial,
      isLoadingUpdate,
      onboardingByMarket,
      onboardingStatus,
      borrowers,
      policyMarkets,
      isPolicyMarketsLoading,
      defaults,
    ],
  )

  return (
    <LenderMarketsContext.Provider value={contextValue}>
      {children}
    </LenderMarketsContext.Provider>
  )
}
