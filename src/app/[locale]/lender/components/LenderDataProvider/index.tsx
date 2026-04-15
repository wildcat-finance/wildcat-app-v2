"use client"

import { ReactNode, useEffect, useMemo } from "react"

import {
  DepositStatus,
  LenderRole,
  MarketVersion,
} from "@wildcatfi/wildcat-sdk"

import { useBorrowerNames } from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import { LenderMarketsContext } from "@/app/[locale]/lender/context"
import { useLendersMarkets } from "@/app/[locale]/lender/hooks/useLendersMarkets"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useAppDispatch } from "@/store/hooks"
import { setLendersSectionAmount } from "@/store/slices/lenderDashboardAmountSlice/lenderDashboardAmountsSlice"
import { EXCLUDED_MARKETS } from "@/utils/constants"

export const LenderDataProvider = ({ children }: { children: ReactNode }) => {
  const dispatch = useAppDispatch()
  const { isWrongNetwork } = useCurrentNetwork()

  const {
    data: marketAccounts,
    isLoadingInitial,
    isLoadingUpdate,
  } = useLendersMarkets()

  const { data: borrowers } = useBorrowerNames()

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

  const depositedMarketsAmount = useMemo(
    () =>
      lenderMarkets.filter(
        (market) => !market.market.isClosed && market.hasEverInteracted,
      ).length,
    [lenderMarkets],
  )

  const nonDepositedMarketsAmount = useMemo(
    () =>
      lenderMarkets.filter(
        (market) => !market.market.isClosed && !market.hasEverInteracted,
      ).length,
    [lenderMarkets],
  )

  const prevActiveAmount = useMemo(
    () =>
      lenderMarkets.filter(
        (market) => market.market.isClosed && market.hasEverInteracted,
      ).length,
    [lenderMarkets],
  )

  const neverActiveAmount = useMemo(
    () =>
      lenderMarkets.filter(
        (market) => market.market.isClosed && !market.hasEverInteracted,
      ).length,
    [lenderMarkets],
  )

  const selfOnboardAmount = useMemo(
    () =>
      othersMarkets.filter(
        (account) =>
          !account.market.isClosed &&
          !account.hasEverInteracted &&
          account.market.version === MarketVersion.V2 &&
          account.depositAvailability === DepositStatus.Ready,
      ).length,
    [othersMarkets],
  )

  const manualAmount = useMemo(
    () =>
      othersMarkets.filter(
        (account) =>
          !account.market.isClosed &&
          !(
            !account.hasEverInteracted &&
            account.market.version === MarketVersion.V2 &&
            account.depositAvailability === DepositStatus.Ready
          ),
      ).length,
    [othersMarkets],
  )

  const terminatedOtherAmount = useMemo(
    () => othersMarkets.filter((account) => account.market.isClosed).length,
    [othersMarkets],
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
  }, [
    depositedMarketsAmount,
    nonDepositedMarketsAmount,
    prevActiveAmount,
    neverActiveAmount,
    selfOnboardAmount,
    manualAmount,
    terminatedOtherAmount,
    isWrongNetwork,
    dispatch,
  ])

  const contextValue = useMemo(
    () => ({ marketAccounts, isLoadingInitial, isLoadingUpdate, borrowers }),
    [marketAccounts, isLoadingInitial, isLoadingUpdate, borrowers],
  )

  return (
    <LenderMarketsContext.Provider value={contextValue}>
      {children}
    </LenderMarketsContext.Provider>
  )
}
