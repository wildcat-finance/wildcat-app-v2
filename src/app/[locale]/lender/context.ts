"use client"

import { createContext, useContext } from "react"

import { MarketAccount } from "@wildcatfi/wildcat-sdk"

import { BorrowerWithName } from "@/app/[locale]/borrower/hooks/useBorrowerNames"

export type LenderMarketsContextType = {
  marketAccounts: MarketAccount[]
  isLoadingInitial: boolean
  isLoadingUpdate: boolean
  borrowers: BorrowerWithName[] | undefined
}

const defaultContext: LenderMarketsContextType = {
  marketAccounts: [],
  isLoadingInitial: false,
  isLoadingUpdate: false,
  borrowers: undefined,
}

export const LenderMarketsContext =
  createContext<LenderMarketsContextType>(defaultContext)

export const useLenderMarketsContext = () => useContext(LenderMarketsContext)
