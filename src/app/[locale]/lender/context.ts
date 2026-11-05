"use client"

import { createContext, useContext } from "react"

import { MarketAccount } from "@wildcatfi/wildcat-sdk"

import { BorrowerWithName } from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import { LenderMarketsOnboardingStatus } from "@/app/[locale]/lender/hooks/useLendersMarkets"
import { MarketOnboardingByAddress } from "@/utils/marketOnboarding"

export type LenderMarketsDefaults = {
  isLoading: boolean
  isError: boolean
  isDefaulted: (marketAddress?: string) => boolean | undefined
  defaultedMarketsOfBorrower: (borrowerAddress?: string) => string[]
}

export type LenderMarketsContextType = {
  marketAccounts: MarketAccount[]
  isLoadingInitial: boolean
  isLoadingUpdate: boolean
  onboardingByMarket: MarketOnboardingByAddress
  onboardingStatus: LenderMarketsOnboardingStatus
  borrowers: BorrowerWithName[] | undefined
  policyMarkets: Set<string>
  isPolicyMarketsLoading: boolean
  defaults: LenderMarketsDefaults
}

const defaultContext: LenderMarketsContextType = {
  marketAccounts: [],
  isLoadingInitial: false,
  isLoadingUpdate: false,
  onboardingByMarket: {},
  onboardingStatus: "loading",
  borrowers: undefined,
  policyMarkets: new Set(),
  isPolicyMarketsLoading: false,
  defaults: {
    isLoading: false,
    isError: false,
    isDefaulted: () => undefined,
    defaultedMarketsOfBorrower: () => [],
  },
}

export const LenderMarketsContext =
  createContext<LenderMarketsContextType>(defaultContext)

export const useLenderMarketsContext = () => useContext(LenderMarketsContext)
