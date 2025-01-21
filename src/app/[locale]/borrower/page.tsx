"use client"

import React, { useEffect } from "react"

import { Box } from "@mui/material"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { LendersSection } from "@/app/[locale]/borrower/components/LendersSection"
import { useGetBorrowerMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useGetController } from "@/hooks/useGetController"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  BorrowerDashboardSections,
  setShowFullFunctionality,
} from "@/store/slices/borrowerDashboardSlice/borrowerDashboardSlice"

import { MarketsSection } from "./components/MarketsSection"
import { PoliciesSection } from "./components/PoliciesSection"

export default function BorrowerPage() {
  const dispatch = useAppDispatch()

  const section = useAppSelector((state) => state.borrowerDashboard.section)

  const { isConnected } = useAccount()

  const {
    data: unfilteredBorrowerMarkets,
    isLoading: isBorrowerMarketsLoading,
  } = useGetBorrowerMarkets(undefined)

  const { data: controller } = useGetController()
  const isRegisteredBorrower = controller?.isRegisteredBorrower

  const { isWrongNetwork } = useCurrentNetwork()

  const showTables = !isWrongNetwork && isConnected && isRegisteredBorrower

  useEffect(() => {
    dispatch(setShowFullFunctionality(!!showTables))
  }, [showTables])

  return (
    <Box
      sx={{
        padding: "32px 0 0",
        overflow: "hidden",
      }}
    >
      {section === BorrowerDashboardSections.MARKETS && <MarketsSection />}

      {section === BorrowerDashboardSections.LENDERS && (
        <LendersSection
          markets={unfilteredBorrowerMarkets}
          isMarketsLoading={isBorrowerMarketsLoading}
        />
      )}

      {section === BorrowerDashboardSections.POLICIES && (
        <PoliciesSection
          markets={unfilteredBorrowerMarkets}
          isMarketsLoading={isBorrowerMarketsLoading}
        />
      )}
    </Box>
  )
}
