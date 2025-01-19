"use client"

import React from "react"

import { Box } from "@mui/material"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { PoliciesSection } from "@/app/[locale]/borrower/components/PoliciesTab"
import { useGetBorrowerMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets"
import { useGetOthersMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetOthersMarkets"
import { useLendersMarkets } from "@/app/[locale]/lender/hooks/useLendersMarkets"
import { MarketsSection } from "./components/MarketsSection"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { BorrowerDashboardSections } from "@/store/slices/borrowerDashboardSlice/borrowerDashboardSlice"
import { useGetAllLenders } from "@/app/[locale]/borrower/hooks/useGetAllLenders"

export default function BorrowerPage() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const section = useAppSelector((state) => state.borrowerDashboard.section)

  const { isConnected, address } = useAccount()

  const {
    data: unfilteredBorrowerMarkets,
    isLoading: isBorrowerMarketsLoading,
  } = useGetBorrowerMarkets(undefined)
  const { data: unfilteredOtherMarkets, isLoading: isOthersMarketsLoading } =
    useGetOthersMarkets()

  const { data: lenders } = useGetAllLenders()

  console.log(lenders, "lenders")

  return (
    <Box
      sx={{
        padding: "32px 0 0",
        overflow: "hidden",
      }}
    >
      {section === BorrowerDashboardSections.MARKETS && <MarketsSection />}

      {section === BorrowerDashboardSections.POLICIES && (
        <PoliciesSection
          markets={unfilteredBorrowerMarkets}
          isMarketsLoading={isBorrowerMarketsLoading}
        />
      )}
    </Box>
  )
}
