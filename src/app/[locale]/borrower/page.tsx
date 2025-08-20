"use client"

import React, { useEffect } from "react"

import { Box, Button, Typography } from "@mui/material"
import { GridRowsProp } from "@mui/x-data-grid"
import { HooksKind } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useAccount } from "wagmi"

import { LendersSection } from "@/app/[locale]/borrower/components/LendersSection"
import { useGetBorrowerMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets"
import { useGetBorrowerHooksDataWithSubgraph } from "@/app/[locale]/borrower/hooks/useGetBorrowerHooksData"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useGetController } from "@/hooks/useGetController"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { ROUTES } from "@/routes"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setSectionAmount } from "@/store/slices/borrowerDashboardAmountsSlice/borrowerDashboardAmountsSlice"
import {
  BorrowerDashboardSections,
  setShowFullFunctionality,
} from "@/store/slices/borrowerDashboardSlice/borrowerDashboardSlice"
import { COLORS } from "@/theme/colors"

import { MarketsSection } from "./components/MarketsSection"
import { PoliciesSection, PolicyDataT } from "./components/PoliciesSection"

export default function BorrowerPage() {
  const dispatch = useAppDispatch()
  const isMobile = useMobileResolution()

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

  const { data: hooksData, isLoading: isPoliciesLoading } =
    useGetBorrowerHooksDataWithSubgraph()

  const policies: GridRowsProp<PolicyDataT> = [
    ...(hooksData?.hooksInstances.map((policy) => ({
      id: policy.address,
      name: policy.name || "Unnamed Policy",
      type: policy.kind,
      markets: unfilteredBorrowerMarkets
        ? unfilteredBorrowerMarkets
            .filter(
              (market) => market.hooksConfig?.hooksAddress === policy.address,
            )
            .map((market) => ({ name: market.name, address: market.address }))
        : [],
      accessRequirements:
        policy.roleProviders.length === 1 ? "Manual Approval" : "Self-Onboard",
    })) ?? []),
    ...(hooksData?.controller
      ? [
          {
            id: hooksData.controller.address,
            name: "V1 Markets",
            type: HooksKind.OpenTerm,
            markets: unfilteredBorrowerMarkets
              ? unfilteredBorrowerMarkets.filter(
                  (market) => market.hooksConfig?.hooksAddress === undefined,
                )
              : [],
            accessRequirements: "Manual Approval",
          },
        ]
      : []),
  ]

  const policiesAmount = policies.length

  useEffect(() => {
    dispatch(setShowFullFunctionality(!!showTables))
  }, [showTables])

  useEffect(() => {
    dispatch(setSectionAmount({ name: "policies", value: policiesAmount }))
  }, [policiesAmount])

  if (isMobile)
    return (
      <Box
        sx={{
          width: "100%",
          backgroundColor: COLORS.white,
          padding: "20px",
          borderRadius: "14px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          marginTop: "4px",
          justifyContent: "center",
        }}
      >
        <Typography variant="mobH3">
          The Borrower UI is not configured for mobile, sorry!
        </Typography>
        <Typography variant="mobText3" color={COLORS.santasGrey}>
          Hop on a desktop or laptop instead: we are aiming to sort this out in
          time.
        </Typography>
        <Link
          href={ROUTES.lender.root}
          style={{
            textDecoration: "none",
            marginTop: "14px",
            display: "flex",
            width: "fit-content",
          }}
        >
          <Button variant="contained" size="medium" color="secondary">
            Switch to the Lenders
          </Button>
        </Link>
      </Box>
    )

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
          policies={policies}
          markets={unfilteredBorrowerMarkets}
          isMarketsLoading={isBorrowerMarketsLoading}
          isPoliciesLoading={isPoliciesLoading}
        />
      )}
    </Box>
  )
}
