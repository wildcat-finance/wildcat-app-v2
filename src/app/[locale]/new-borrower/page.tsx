"use client"

import React from "react"

import { Box } from "@mui/material"
import { useTranslation } from "react-i18next"

import { PoliciesSection } from "@/app/[locale]/borrower/components/PoliciesTab"
import { useGetBorrowerMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets"
import { useGetOthersMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetOthersMarkets"
import { MarketsSection } from "@/app/[locale]/new-borrower/components/MarketsSection"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { BorrowerDashboardSections } from "@/store/slices/borrowerDashboardSlice/borrowerDashboardSlice"

export default function BorrowerPage() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const section = useAppSelector((state) => state.borrowerDashboard.section)

  const {
    data: unfilteredBorrowerMarkets,
    isLoading: isBorrowerMarketsLoading,
  } = useGetBorrowerMarkets(undefined)
  const { data: unfilteredOtherMarkets, isLoading: isOthersMarketsLoading } =
    useGetOthersMarkets()

  return (
    <Box
      sx={{
        height: "calc(100vh - 43px - 43px - 52px)",
        padding: "32px 0 0",
        overflow: "hidden",
      }}
    >
      {section === BorrowerDashboardSections.MARKETS && (
        <MarketsSection
          unfilteredBorrowerMarkets={unfilteredBorrowerMarkets}
          unfilteredOtherMarkets={unfilteredOtherMarkets}
          isBorrowerMarketsLoading={isBorrowerMarketsLoading}
          isOtherMarketsLoading={isOthersMarketsLoading}
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
