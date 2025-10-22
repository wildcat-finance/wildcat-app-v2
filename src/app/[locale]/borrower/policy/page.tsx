"use client"

import * as React from "react"
import { useEffect, useState } from "react"

import { Box, Tab, Tabs, Typography } from "@mui/material"
import {
  HooksKind,
  // eslint-disable-next-line camelcase
  SubgraphMarket_OrderBy,
  SubgraphOrderDirection,
} from "@wildcatfi/wildcat-sdk"
import { useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { match } from "ts-pattern"

import { GlossarySidebar } from "@/app/[locale]/borrower/create-market/components/GlossarySidebar"
import { useGetBorrowerHooksDataWithSubgraph } from "@/app/[locale]/borrower/hooks/useGetBorrowerHooksData"
import { useGetPolicy } from "@/app/[locale]/borrower/hooks/useGetPolicy"
import { DetailsTab } from "@/app/[locale]/borrower/policy/components/DetailsTab"
import { LendersTab } from "@/app/[locale]/borrower/policy/components/LendersTab"
import { EditLenderFlowStatuses } from "@/app/[locale]/borrower/policy/components/LendersTab/interface"
import { MarketsTab } from "@/app/[locale]/borrower/policy/components/MarketsTab"
import { PolicySelect } from "@/app/[locale]/borrower/policy/components/PolicySelect"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { CreateMarketSteps } from "@/store/slices/createMarketSidebarSlice/createMarketSidebarSlice"
import {
  resetPolicyLendersState,
  setInitialPolicyLenders,
  setPolicyLenders,
} from "@/store/slices/policyLendersSlice/policyLendersSlice"
import { COLORS } from "@/theme/colors"
import { lh, pxToRem } from "@/theme/units"
import { pageCalcHeights } from "@/utils/constants"

import { SmallFilterSelectItem } from "../../../../components/SmallFilterSelect"

const TabStyle = {
  fontSize: pxToRem(13),
  lineHeight: lh(20, 13),
  fontWeight: 500,
  height: "41px",
  minHeight: "41px",
  minWidth: "fit-content",
  padding: "0 4px",

  borderColor: COLORS.athensGrey,
}

enum PolicyTabs {
  DETAILS = "details",
  MARKETS = "markets",
  LENDERS = "lenders",
}

export default function PolicyPage() {
  const { t } = useTranslation()
  const urlParams = useSearchParams()
  const policyAddress = urlParams.get("policy")

  const { data, isLoading: isPolicyLoading } = useGetPolicy({
    policy: policyAddress || undefined,
    // eslint-disable-next-line camelcase
    orderMarkets: SubgraphMarket_OrderBy.IsClosed,
    directionMarkets: SubgraphOrderDirection.Asc,
  })

  const { data: hooksData, isLoading: isHooksDataLoading } =
    useGetBorrowerHooksDataWithSubgraph()

  const isLoading = isPolicyLoading || isHooksDataLoading

  const policies = [
    ...(hooksData?.hooksInstances.map((policy) => ({
      id: policy.address,
      name: policy.name || "Unnamed Policy",
    })) ?? []),
    ...(hooksData?.controller
      ? [
          {
            id: hooksData.controller.address,
            name: "V1 Markets",
          },
        ]
      : []),
  ]

  const [selectedPolicy, setSelectedPolicy] = useState<SmallFilterSelectItem>({
    id: "",
    name: "",
  })

  const policyName = policies.find((policy) => policy.id === policyAddress)
    ?.name

  useEffect(() => {
    if (policyName && policyAddress) {
      setSelectedPolicy({
        id: policyAddress,
        name: policyName,
      })
    }
  }, [data, policyName, policyAddress])

  const accessControl = data?.hooksInstance?.roleProviders.some(
    (p) => p.isPullProvider,
  )
    ? t("roleProviders.defaultPullProvider")
    : t("roleProviders.manualApproval")

  const [tab, setTab] = useState<PolicyTabs>(PolicyTabs.DETAILS)

  const handleTabsChange = (
    event: React.SyntheticEvent,
    newTab: PolicyTabs,
  ) => {
    setTab(newTab)
  }

  const markets = data?.markets ?? []
  const lenders = data?.lenders

  const dispatch = useAppDispatch()

  const lendersList = useAppSelector((state) => state.policyLenders.lenders)

  useEffect(() => {
    if (lenders) {
      const lendersData =
        data?.lenders?.map((lender) => {
          let isAuthorized: boolean
          const { credential } = lender
          if (credential) {
            const { lastProvider } = credential
            isAuthorized = !!lastProvider
            return {
              id: lender.address,
              address: lender.address,
              status: EditLenderFlowStatuses.OLD,
              isAuthorized,
            }
          }
          if (lender.isAuthorizedOnController) {
            isAuthorized = true
          } else {
            isAuthorized = false
          }
          return {
            id: lender.address,
            address: lender.address,
            status: EditLenderFlowStatuses.OLD,
            isAuthorized,
          }
        }) ?? []

      if (lendersList.length === 0) {
        dispatch(setPolicyLenders(lendersData))
      }
      dispatch(setInitialPolicyLenders(lendersData))
    }
  }, [data, isPolicyLoading])

  useEffect(
    () => () => {
      dispatch(resetPolicyLendersState())
    },
    [],
  )

  return (
    <Box
      sx={{
        width: "100%",
        height: `calc(100vh - ${pageCalcHeights.page})`,
        display: "flex",
        justifyContent: "space-between",
        overflow: "hidden",
        overflowY: "visible",
      }}
    >
      <Box
        sx={{
          width: "100%",
        }}
      >
        <Box sx={{ display: "flex", gap: "6px", padding: "40px 24px 0" }}>
          <Typography variant="title2">Policy Info</Typography>

          <PolicySelect
            policies={policies}
            selected={selectedPolicy}
            setSelected={setSelectedPolicy}
          />
        </Box>

        <Tabs
          value={tab}
          onChange={handleTabsChange}
          sx={{
            marginTop: "16px",
            height: "41px",
            minHeight: "41px",

            "& .MuiTabs-flexContainer": {
              alignItems: "flex-end",
            },
          }}
        >
          <Box
            sx={{
              width: "24px",
              minWidth: "24px",
              height: "1px",
              backgroundColor: COLORS.athensGrey,
            }}
          />
          <Tab value={PolicyTabs.DETAILS} label="Details" sx={TabStyle} />
          <Tab value={PolicyTabs.MARKETS} label="Markets" sx={TabStyle} />
          <Tab value={PolicyTabs.LENDERS} label="Lenders" sx={TabStyle} />
          <Box
            sx={{
              width: "100%",
              height: "1px",
              backgroundColor: COLORS.athensGrey,
            }}
          />
        </Tabs>

        <Box sx={{ width: "100%", padding: "0 24px" }}>
          {match(tab)
            .with(PolicyTabs.DETAILS, () => (
              <DetailsTab
                name={policyName}
                type={
                  (data?.hooksInstance?.kind ?? HooksKind.OpenTerm) ===
                  HooksKind.OpenTerm
                    ? t("policyType.OpenTerm")
                    : t("policyType.FixedTerm")
                }
                access={accessControl}
                isLoading={isLoading}
              />
            ))
            .with(PolicyTabs.MARKETS, () => (
              <MarketsTab markets={markets} isLoading={isLoading} />
            ))
            .with(PolicyTabs.LENDERS, () => (
              <LendersTab
                isLoading={isLoading}
                policyName={selectedPolicy.name}
                policy={data?.hooksInstance}
                controller={data?.controller}
              />
            ))
            .otherwise(() => null)}
        </Box>
      </Box>

      {tab === PolicyTabs.DETAILS && (
        <GlossarySidebar step={CreateMarketSteps.POLICY} />
      )}
    </Box>
  )
}
