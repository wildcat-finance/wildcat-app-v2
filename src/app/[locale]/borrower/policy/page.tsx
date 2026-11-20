"use client"

import * as React from "react"
import { useEffect, useState } from "react"

import { Box, Tab, Tabs, Typography } from "@mui/material"
import { hasDeploymentAddress, HooksKind } from "@wildcatfi/wildcat-sdk"
import { useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"

import { GlossarySidebar } from "@/app/[locale]/borrower/create-market/components/GlossarySidebar"
import { useGetBorrowerHooksDataWithSubgraph } from "@/app/[locale]/borrower/hooks/useGetBorrowerHooksData"
import { useGetPolicy } from "@/app/[locale]/borrower/hooks/useGetPolicy"
import { DetailsTab } from "@/app/[locale]/borrower/policy/components/DetailsTab"
import { LendersTab } from "@/app/[locale]/borrower/policy/components/LendersTab"
import { EditLenderFlowStatuses } from "@/app/[locale]/borrower/policy/components/LendersTab/interface"
import { MarketsTab } from "@/app/[locale]/borrower/policy/components/MarketsTab"
import { PolicySelect } from "@/app/[locale]/borrower/policy/components/PolicySelect"
import { MarketRoleProviders } from "@/components/RoleProviders/MarketRoleProviders"
import {
  POLICY_TYPE_KEY,
  POLICY_ACCESS_CONTROL_KEY,
} from "@/constants/i18nKeys"
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
import { getPolicyAccessControl } from "@/utils/marketCapabilities"
import { mergePolicyLenderAccess } from "@/utils/policyLenderAccess"
import { shouldSyncPolicyLenderDraft } from "@/utils/policyLenderDraft"

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
  PROVIDERS = "providers",
}

export default function PolicyPage() {
  const { t } = useTranslation()
  const urlParams = useSearchParams()
  const policyAddress = urlParams.get("policy")

  const { data, isLoading: isPolicyLoading } = useGetPolicy({
    policy: policyAddress || undefined,
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

  const selectedPolicy = policies.find(
    (item) => item.id.toLowerCase() === policyAddress?.toLowerCase(),
  ) ?? { id: policyAddress ?? "", name: data?.hooksInstance?.name ?? "" }
  const policyName = selectedPolicy.name

  const accessControl = t(
    POLICY_ACCESS_CONTROL_KEY[
      getPolicyAccessControl(data?.hooksInstance?.roleProviders ?? [])
    ],
  )

  const [tab, setTab] = useState<PolicyTabs>(PolicyTabs.DETAILS)

  const policy = data?.hooksInstance
  const supportsProviders =
    !!policy && hasDeploymentAddress(policy.chainId, "KYCRoleProvider")
  const activeTab =
    tab === PolicyTabs.PROVIDERS && !supportsProviders
      ? PolicyTabs.DETAILS
      : tab
  const handleTabsChange = (
    event: React.SyntheticEvent,
    newTab: PolicyTabs,
  ) => {
    setTab(newTab)
  }

  const markets = data?.markets ?? []
  const lenders = React.useMemo(
    () =>
      data
        ? mergePolicyLenderAccess(data.lenders, data.accessListMembers)
        : undefined,
    [data],
  )

  const dispatch = useAppDispatch()

  const lendersList = useAppSelector((state) => state.policyLenders.lenders)
  const shouldSyncLenders = shouldSyncPolicyLenderDraft(lendersList)

  useEffect(() => {
    if (lenders && shouldSyncLenders) {
      const lendersData = lenders.map((lender) => ({
        id: lender.address,
        address: lender.address,
        status: EditLenderFlowStatuses.OLD,
        isAuthorized: lender.isAuthorized,
        accessSources: lender.sources,
      }))

      dispatch(setPolicyLenders(lendersData))
      dispatch(setInitialPolicyLenders(lendersData))
    }
  }, [dispatch, lenders, shouldSyncLenders])

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
          <Typography variant="title2">
            {t("borrower.policies.policyInfo")}
          </Typography>

          <PolicySelect policies={policies} selected={selectedPolicy} />
        </Box>

        <Tabs
          value={activeTab}
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
          <Tab
            value={PolicyTabs.DETAILS}
            label={t("common.fields.details")}
            sx={TabStyle}
          />
          <Tab
            value={PolicyTabs.MARKETS}
            label={t("common.placeholders.markets")}
            sx={TabStyle}
          />
          <Tab
            value={PolicyTabs.LENDERS}
            label={t("common.placeholders.lenders")}
            sx={TabStyle}
          />
          {supportsProviders && (
            <Tab
              value={PolicyTabs.PROVIDERS}
              label={t("borrower.kyc.providers")}
              sx={TabStyle}
            />
          )}
          <Box
            sx={{
              width: "100%",
              height: "1px",
              backgroundColor: COLORS.athensGrey,
            }}
          />
        </Tabs>

        <Box sx={{ width: "100%", padding: "0 24px" }}>
          {activeTab === PolicyTabs.DETAILS && (
            <DetailsTab
              name={policyName}
              type={t(
                POLICY_TYPE_KEY[
                  data?.hooksInstance?.kind ?? HooksKind.OpenTerm
                ],
              )}
              access={accessControl}
              isLoading={isLoading}
            />
          )}

          {activeTab === PolicyTabs.MARKETS && (
            <MarketsTab markets={markets} isLoading={isLoading} />
          )}

          {activeTab === PolicyTabs.PROVIDERS &&
            policy &&
            selectedPolicy.id.toLowerCase() ===
              policy.address.toLowerCase() && (
              <MarketRoleProviders
                key={`${policy.chainId}-${policy.address}`}
                policy={policy}
              />
            )}

          {activeTab === PolicyTabs.LENDERS && (
            <LendersTab
              isLoading={isLoading}
              policyName={selectedPolicy.name}
              policy={data?.hooksInstance}
              controller={data?.controller}
            />
          )}
        </Box>
      </Box>

      {activeTab === PolicyTabs.DETAILS && (
        <GlossarySidebar step={CreateMarketSteps.POLICY} />
      )}
    </Box>
  )
}
