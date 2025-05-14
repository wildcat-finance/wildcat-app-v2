"use client"

import { useEffect } from "react"
import * as React from "react"

import { Box, FormControlLabel, TextField, Typography } from "@mui/material"
import {
  HooksKind,
  MarketVersion,
  // eslint-disable-next-line camelcase
  SubgraphMarket_OrderBy,
  SubgraphOrderDirection,
} from "@wildcatfi/wildcat-sdk"
import { PolicyLender } from "@wildcatfi/wildcat-sdk/dist/gql/utils"
import { useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { match } from "ts-pattern"

import { useGetBorrowerMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets"
import { InputLabel } from "@/components/InputLabel"
import {
  InputLabelContainer,
  InputLabelSubtitle,
  InputLabelTypo,
} from "@/components/InputLabel/style"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  resetEditPolicyState,
  resetPolicyFilters,
  setActivePolicyMarkets,
  setInitialPolicyLendersTableData,
  setPolicyLenderFilter,
  setPolicyLendersTableData,
} from "@/store/slices/editPolicySlice/editPolicySlice"

import { ConfirmLendersForm } from "./components/ConfirmLendersForm"
import { EditLendersForm } from "./components/EditLendersForm"
import useTrackPolicyLendersChanges from "./hooks/useTrackLendersChanges"
import {
  PolicyLenderTableDataType,
  EditLenderFlowStatuses,
  LenderInfo,
} from "./interface"
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
    // eslint-disable-next-line camelcase
    orderMarkets: SubgraphMarket_OrderBy.IsClosed,
    directionMarkets: SubgraphOrderDirection.Asc,
  })

  const lendersTableData = useAppSelector(
    (state) => state.editPolicy.lendersTableData,
  )
  const [originalPolicyName, setOriginalPolicyName] = React.useState("")
  const [hooksKind, setHooksKind] = React.useState<HooksKind | undefined>()
  const [lenders, setLenders] = React.useState<LenderInfo[]>([])
  const [version, setVersion] = React.useState<MarketVersion | undefined>()
  const [pendingPolicyName, setPendingPolicyName] = React.useState("")
  const [accessControl, setAccessControl] = React.useState<string | undefined>()
  const markets = data?.markets ?? []

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
        const hasPullProvider = hooksInstance.roleProviders.some(
          (p) => p.isPullProvider,
        )
        setAccessControl(
          hasPullProvider
            ? t("roleProviders.defaultPullProvider")
            : t("roleProviders.manualApproval"),
        )
        // @todo update when we have provider names
      } else {
        policyName = "V1 Markets"
        setAccessControl(t("roleProviders.manualApproval"))
      }
      const lendersData =
        data.lenders?.map((lender) => {
          let credentialExpiry: number | undefined
          let credentialSource: string
          const maxTimeToLive = 2 ** 32 - 1
          const { credential } = lender
          if (credential) {
            const { lastProvider } = credential
            if (lastProvider) {
              credentialSource = lastProvider.isPushProvider
                ? t("editPolicy.roleProviders.manualApproval")
                : t("editPolicy.roleProviders.defaulPullProvider")
              credentialExpiry =
                lastProvider.timeToLive === maxTimeToLive
                  ? maxTimeToLive
                  : credential.lastApprovalTimestamp + lastProvider.timeToLive
            } else {
              credentialSource = t("editPolicy.deauthorized")
            }
            return {
              ...lender,
              credentialExpiry,
              credentialSource,
            }
          }
          if (lender.isAuthorizedOnController) {
            credentialExpiry = undefined
            credentialSource = t("editPolicy.roleProviders.manualApproval")
          } else {
            credentialExpiry = maxTimeToLive
            credentialSource = t("editPolicy.deauthorized")
          }
          return {
            ...lender,
            credentialExpiry,
            credentialSource,
          }
        }) ?? []
      setLenders(lendersData)
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
  }, [isPolicyLoading, data])

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
            {t("editPolicy.editing")} {!isLoading && t("editPolicy.for")}
          </Typography>
        ) : (
          <Typography variant="title2">{t("editPolicy.confirm")}</Typography>
        )}

        {!isLoading && step === "edit" && (
          <Typography variant="title2">
            {originalPolicyName || t("editPolicy.unnamedPolicy.label")}
          </Typography>
        )}
      </Box>
      <Typography variant="title2">{t("editPolicy.policyDetails")}</Typography>
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
                  {t("editPolicy.forms.policyName.title")}
                </Typography>
              </Box>
            </Box>
            <Typography marginTop="0px" variant="text3" sx={InputLabelSubtitle}>
              {originalPolicyName ? "" : t("editPolicy.unnamedPolicy.subtitle")}
            </Typography>
          </Box>
          <Box>
            {version === MarketVersion.V1 ? (
              <Typography variant="text1">{originalPolicyName}</Typography>
            ) : (
              <TextField
                value={pendingPolicyName}
                onChange={(e) => setPendingPolicyName(e.target.value)}
                label={t("editPolicy.forms.policyName.title")}
                placeholder={t(
                  "createMarket.forms.marketDescription.block.policyName.placeholder",
                )}
              />
            )}
          </Box>
        </Box>
        <Box display="flex" flexDirection="row">
          <Box sx={{ width: "300px" }}>
            <Box sx={InputLabelContainer} marginBottom="2px">
              <Box sx={InputLabelTypo}>
                <Typography variant="text1">
                  {t("editPolicy.policyType")}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box>
            <Typography variant="text1">
              {hooksKind === HooksKind.OpenTerm
                ? t("policyType.OpenTerm")
                : t("policyType.FixedTerm")}
            </Typography>
          </Box>
        </Box>
        <Box display="flex" flexDirection="row">
          <Box sx={{ width: "300px" }}>
            <Box sx={InputLabelContainer} marginBottom="2px">
              <Box sx={InputLabelTypo}>
                <Typography variant="text1">
                  {t("editPolicy.accessControl")}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box>
            <Typography variant="text1">{accessControl}</Typography>
          </Box>
        </Box>
      </Box>

      <Typography variant="title2">{t("editPolicy.markets")}</Typography>
      <Box>
        <BorrowerMarketsTable
          label={t("editPolicy.markets")}
          // type="active"
          usePagination
          noMarketsTitle=""
          noMarketsSubtitle=""
          tableData={markets}
          isLoading={isMarketsLoading}
          isOpen
        />
      </Box>
      <Typography variant="title2">{t("editPolicy.lenders")}</Typography>

      {match(step)
        .with("edit", () => <EditLendersForm isLoading={isLoading} />)
        .with("confirm", () => (
          <ConfirmLendersForm
            originalPolicyName={originalPolicyName}
            pendingPolicyName={pendingPolicyName}
            policy={data?.hooksInstance}
            controller={data?.controller}
          />
        ))
        .otherwise(() => null)}
    </Box>
  )
}
