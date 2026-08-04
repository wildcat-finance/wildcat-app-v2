"use client"

import { createContext, useContext } from "react"

import { MarketAccount } from "@wildcatfi/wildcat-sdk"

import { BorrowerWithName } from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import { LenderMarketsOnboardingStatus } from "@/app/[locale]/lender/hooks/useLendersMarkets"
import { MarketOnboardingByAddress } from "@/utils/marketOnboarding"

export type LenderMarketsContextType = {
  marketAccounts: MarketAccount[]
  hasMarketUpdates: boolean
  isLoadingInitial: boolean
  isLoadingUpdate: boolean
  onboardingByMarket: MarketOnboardingByAddress
  onboardingStatus: LenderMarketsOnboardingStatus
  borrowers: BorrowerWithName[] | undefined
}

const defaultContext: LenderMarketsContextType = {
  marketAccounts: [],
  hasMarketUpdates: false,
  isLoadingInitial: false,
  isLoadingUpdate: false,
  onboardingByMarket: {},
  onboardingStatus: "loading",
  borrowers: undefined,
}

export const LenderMarketsContext =
  createContext<LenderMarketsContextType>(defaultContext)

export const useLenderMarketsContext = () => useContext(LenderMarketsContext)
