"use client"

import { useEffect } from "react"
import * as React from "react"

import { Box, FormControlLabel, TextField, Typography } from "@mui/material"
import { HooksKind, MarketVersion } from "@wildcatfi/wildcat-sdk"
import { useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"

import { useGetBorrowerMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets"
import { InputLabel } from "@/components/InputLabel"
import {
  InputLabelContainer,
  InputLabelSubtitle,
  InputLabelTypo,
} from "@/components/InputLabel/style"
import { POLICY_TYPE_KEY } from "@/constants/i18nKeys"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  resetEditPolicyState,
  resetPolicyFilters,
  setActivePolicyMarkets,
  setInitialPolicyLendersTableData,
  setPolicyLenderFilter,
  setPolicyLendersTableData,
} from "@/store/slices/editPolicySlice/editPolicySlice"
import { canManagePolicyLenders } from "@/utils/lenderAccess"
import { hasActiveLenderOnboardingRoleProvider } from "@/utils/marketCapabilities"
import {
  mergePolicyLenderAccess,
  POLICY_LENDER_ACCESS_SOURCE_KEY,
} from "@/utils/policyLenderAccess"

import { ConfirmLendersForm } from "./components/ConfirmLendersForm"
import { EditLendersForm } from "./components/EditLendersForm"
import useTrackPolicyLendersChanges from "./hooks/useTrackLendersChanges"
import { PolicyLenderTableDataType, EditLenderFlowStatuses } from "./interface"
import { BorrowerMarketsTable } from "../components/MarketsTables/BorrowerMarketsTable"
import { useGetPolicy } from "../hooks/useGetPolicy"

export default function EditPolicyPage() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const urlParams = useSearchParams()
  const policyAddress = urlParams.get("policy")
  // Getting Lenders Data Logic
  const { data, isLoading: isPolicyLoading } = useGetPolicy({
    policy: policyAddress || undefined,
  })

  const lendersTableData = useAppSelector(
    (state) => state.editPolicy.lendersTableData,
  )
  const [originalPolicyName, setOriginalPolicyName] = React.useState("")
  const [hooksKind, setHooksKind] = React.useState<HooksKind | undefined>()
  const [version, setVersion] = React.useState<MarketVersion | undefined>()
  const [pendingPolicyName, setPendingPolicyName] = React.useState("")
  const [accessControl, setAccessControl] = React.useState<string | undefined>()
  const markets = data?.markets ?? []

  const canEditLenders = data?.controller
    ? true
    : canManagePolicyLenders(data?.hooksInstance)

  useEffect(() => {
    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-shadow
      const { hooksInstance } = data
      setVersion(hooksInstance ? MarketVersion.V2 : MarketVersion.V1)
      let policyName: string
      // eslint-disable-next-line @typescript-eslint/no-shadow
      const hooksKind = hooksInstance?.kind ?? HooksKind.OpenTerm
      if (hooksInstance) {
        policyName = hooksInstance.name
        const hasPullProvider = hasActiveLenderOnboardingRoleProvider(
          hooksInstance.roleProviders,
        )
        setAccessControl(
          hasPullProvider
            ? t("marketParameters.roleProviders.defaultPullProvider")
            : t("marketParameters.roleProviders.manualApproval"),
        )
        // @todo update when we have provider names
      } else {
        policyName = "V1 Markets"
        setAccessControl(t("marketParameters.roleProviders.manualApproval"))
      }
      const maxTimeToLive = 2 ** 32 - 1
      const lendersData = mergePolicyLenderAccess(
        data.lenders,
        data.accessListMembers,
      ).map((access) => {
        const { credential } = access.lender ?? {}
        const { lastProvider } = credential ?? {}
        let credentialExpiry: number | undefined
        if (credential && lastProvider) {
          credentialExpiry =
            lastProvider.timeToLive === maxTimeToLive
              ? maxTimeToLive
              : credential.lastApprovalTimestamp + lastProvider.timeToLive
        }
        const credentialSource = access.isAuthorized
          ? access.sources
              .map((source) => t(POLICY_LENDER_ACCESS_SOURCE_KEY[source]))
              .join(" + ")
          : t("borrower.editPolicy.deauthorized")

        return {
          address: access.address,
          activeMarkets: access.lender?.activeMarkets ?? [],
          credentialExpiry,
          credentialSource,
        }
      })
      setOriginalPolicyName(policyName)
      setPendingPolicyName(policyName)
      setHooksKind(hooksKind)
      const formattedLendersData: PolicyLenderTableDataType[] = lendersData.map(
        ({ activeMarkets, ...lender }) => ({
          id: lender.address,
          address: lender.address,
          credentialExpiry: lender.credentialExpiry,
          credentialSource: lender.credentialSource,
          activeMarkets,
          status: EditLenderFlowStatuses.OLD,
        }),
      )

      dispatch(setInitialPolicyLendersTableData(formattedLendersData))
      if (lendersTableData.length === 0) {
        dispatch(setPolicyLendersTableData(formattedLendersData))
      }
    }
  }, [data, dispatch, lendersTableData.length, t])

  useEffect(() => {
    if (originalPolicyName && pendingPolicyName === "") {
      setPendingPolicyName(originalPolicyName)
    }
  }, [originalPolicyName])

  // Getting Borrower Markets Logic
  const { data: borrowerMarkets, isLoading: isMarketsLoading } =
    useGetBorrowerMarkets()
  const activeBorrowerMarkets = borrowerMarkets
    ?.filter((market) => !market.isClosed)
    .map((market) => ({ name: market.name, address: market.address }))

  useEffect(() => {
    if (activeBorrowerMarkets) {
      dispatch(setActivePolicyMarkets(activeBorrowerMarkets))
    }
  }, [isMarketsLoading])

  // Filtration settings
  const lenderAddress = urlParams.get("lenderAddress")

  useEffect(() => {
    if (lenderAddress) {
      dispatch(setPolicyLenderFilter(lenderAddress))
    }

    return () => {
      dispatch(resetPolicyFilters())
    }
  }, [])

  // Constants
  const isLoading = isPolicyLoading

  const step = useAppSelector((state) => state.editPolicy.step)

  useEffect(
    () => () => {
      dispatch(resetEditPolicyState())
    },
    [],
  )

  useEffect(() => {
    sessionStorage.setItem("previousPageUrl", window.location.href)
  }, [])
  const initialLendersTableData = useAppSelector(
    (state) => state.editPolicy.initialLendersTableData,
  )
  const { addedOrModifiedLenders } = useTrackPolicyLendersChanges(
    initialLendersTableData,
    lendersTableData,
  )

  return (
    <Box
      padding="40px 44px 0 44px"
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        overflow: "hidden",
        overflowY: "visible",
      }}
      height="calc(100vh - 43px - 52px - 52px - 110px)"
    >
      <Box sx={{ display: "flex", gap: "6px", marginBottom: "25px" }}>
        {step === "edit" ? (
          <Typography variant="title2">
            {t("borrower.editPolicy.sidebar.editing")}{" "}
            {!isLoading && t("borrower.editPolicy.for")}
          </Typography>
        ) : (
          <Typography variant="title2">
            {t("borrower.editPolicy.confirm")}
          </Typography>
        )}

        {!isLoading && step === "edit" && (
          <Typography variant="title2">
            {originalPolicyName || t("borrower.editPolicy.unnamedPolicy.label")}
          </Typography>
        )}
      </Box>
      <Typography variant="title2">
        {t("borrower.editPolicy.policyDetails")}
      </Typography>
      <Box
        marginBottom="20px"
        width="600px"
        gap="16px"
        display="flex"
        flexDirection="column"
      >
        <Box display="flex" flexDirection="row" marginTop="16px">
          <Box sx={{ width: "300px" }}>
            <Box sx={InputLabelContainer} marginBottom="2px">
              <Box sx={InputLabelTypo}>
                <Typography variant="text1">
                  {t("common.fields.policyName")}
                </Typography>
              </Box>
            </Box>
            <Typography marginTop="0px" variant="text3" sx={InputLabelSubtitle}>
              {originalPolicyName
                ? ""
                : t("borrower.editPolicy.unnamedPolicy.subtitle")}
            </Typography>
          </Box>
          <Box>
            {version === MarketVersion.V1 ? (
              <Typography variant="text1">{originalPolicyName}</Typography>
            ) : (
              <TextField
                value={pendingPolicyName}
                onChange={(e) => setPendingPolicyName(e.target.value)}
                label={t("common.fields.policyName")}
                placeholder={t("borrower.createMarket.policyName.placeholder")}
              />
            )}
          </Box>
        </Box>
        <Box display="flex" flexDirection="row">
          <Box sx={{ width: "300px" }}>
            <Box sx={InputLabelContainer} marginBottom="2px">
              <Box sx={InputLabelTypo}>
                <Typography variant="text1">
                  {t("borrower.editPolicy.policyType")}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box>
            <Typography variant="text1">
              {t(POLICY_TYPE_KEY[hooksKind ?? HooksKind.OpenTerm])}
            </Typography>
          </Box>
        </Box>
        <Box display="flex" flexDirection="row">
          <Box sx={{ width: "300px" }}>
            <Box sx={InputLabelContainer} marginBottom="2px">
              <Box sx={InputLabelTypo}>
                <Typography variant="text1">
                  {t("borrower.editPolicy.accessControl")}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box>
            <Typography variant="text1">{accessControl}</Typography>
          </Box>
        </Box>
      </Box>

      <Typography variant="title2">
        {t("borrower.editPolicy.markets")}
      </Typography>
      <Box>
        <BorrowerMarketsTable
          label={t("borrower.editPolicy.markets")}
          // type="active"
          usePagination
          noMarketsTitle=""
          noMarketsSubtitle=""
          tableData={markets}
          isLoading={isMarketsLoading}
          isOpen
        />
      </Box>
      <Typography variant="title2">
        {t("borrower.editPolicy.lenders")}
      </Typography>

      {step === "edit" && (
        <EditLendersForm
          isLoading={isLoading}
          canEditLenders={canEditLenders}
        />
      )}

      {step === "confirm" && canEditLenders && (
        <ConfirmLendersForm
          originalPolicyName={originalPolicyName}
          pendingPolicyName={pendingPolicyName}
          policy={data?.hooksInstance}
          controller={data?.controller}
        />
      )}
    </Box>
  )
}
