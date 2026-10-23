"use client"

import { createContext, useContext } from "react"

import { MarketAccount } from "@wildcatfi/wildcat-sdk"

import { BorrowerWithName } from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import { LenderMarketsOnboardingStatus } from "@/app/[locale]/lender/hooks/useLendersMarkets"
import { MarketOnboardingByAddress } from "@/utils/marketOnboarding"

export type LenderMarketsContextType = {
  marketAccounts: MarketAccount[]
  isLoadingInitial: boolean
  isLoadingUpdate: boolean
  onboardingByMarket: MarketOnboardingByAddress
  onboardingStatus: LenderMarketsOnboardingStatus
  borrowers: BorrowerWithName[] | undefined
  policyMarkets: Set<string>
}

const defaultContext: LenderMarketsContextType = {
  marketAccounts: [],
  isLoadingInitial: false,
  isLoadingUpdate: false,
  onboardingByMarket: {},
  onboardingStatus: "loading",
  borrowers: undefined,
  policyMarkets: new Set(),
}

export const LenderMarketsContext =
  createContext<LenderMarketsContextType>(defaultContext)

export const useLenderMarketsContext = () => useContext(LenderMarketsContext)
