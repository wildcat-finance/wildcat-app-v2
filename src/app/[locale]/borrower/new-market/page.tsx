"use client"

import { useEffect, useState, useMemo } from "react"

import { Box } from "@mui/material"
import {
  DepositAccess,
  HooksKind,
  Token,
  TransferAccess,
  WithdrawalAccess,
} from "@wildcatfi/wildcat-sdk"
import { constants } from "ethers"

import { useDeployV2Market } from "@/app/[locale]/borrower/new-market/hooks/useDeployV2Market"
import { useTokenMetadata } from "@/app/[locale]/borrower/new-market/hooks/useTokenMetadata"
import { useGetController } from "@/hooks/useGetController"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  newMarketSteps,
  STEPS_NAME,
} from "@/store/slices/routingSlice/flowsSteps"
import {
  setCurrentFlow,
  setCurrentStep,
} from "@/store/slices/routingSlice/routingSlice"

import { ConfirmationModal } from "./components/ConfirmationModal"
import { LegalInfoForm } from "./components/LegalInfoForm"
import { NewMarketForm } from "./components/NewMarketForm"
import { useLegalInfoForm } from "./hooks/useLegalInfoForm"
import { useNewMarketForm } from "./hooks/useNewMarketForm"
import { useNewMarketHooksData } from "./hooks/useNewMarketHooksData"
import { ContentContainer } from "./style"

const defaultPolicyOption = {
  id: "createNewPolicy",
  label: "Create New Policy",
  value: "createNewPolicy",
} as const

export default function NewMarket() {
  const dispatch = useAppDispatch()

  const newMarketForm = useNewMarketForm()
  const legalInfoForm = useLegalInfoForm()

  const {
    selectedHooksInstance,
    selectedHooksTemplate,
    hooksKind,
    hooksInstances,
    hooksTemplates,
    isLoading: isHooksLoading,
  } = useNewMarketHooksData(newMarketForm)

  const policyOptions = useMemo(
    () => [
      defaultPolicyOption,
      ...(hooksInstances?.map((instance) => ({
        id: instance.address,
        label: instance.name || "Unnamed Policy",
        badge:
          instance.kind === HooksKind.OpenTerm ? "Open Term" : "Fixed Term",
        value: instance.address,
      })) ?? []),
    ],
    [hooksInstances],
  )

  const { deployNewMarket, isDeploying, isSuccess, isError } =
    useDeployV2Market()

  const isLoading = isHooksLoading || isDeploying

  const assetWatch = newMarketForm.watch("asset")

  const { data: assetData } = useTokenMetadata({
    address: assetWatch?.toLowerCase(),
  })

  const [tokenAsset, setTokenAsset] = useState<Token | undefined>()

  useEffect(() => {
    setTokenAsset(assetData)
  }, [assetData])

  const handleDeployMarket = newMarketForm.handleSubmit(() => {
    const marketParams = newMarketForm.getValues()
    // const deployedMarkets = selectedHooksTemplate?.totalMarkets
    if (assetData && tokenAsset && selectedHooksTemplate) {
      const randomSaltNumber = (Math.random() * 1000000000000000000)
        .toString(16)
        .padStart(12, "0")
        .slice(-12)
      deployNewMarket({
        namePrefix: `${marketParams.namePrefix.trimEnd()} `,
        symbolPrefix: marketParams.symbolPrefix,
        annualInterestBips: Number(marketParams.annualInterestBips) * 100,
        delinquencyFeeBips: Number(marketParams.delinquencyFeeBips) * 100,
        reserveRatioBips: Number(marketParams.reserveRatioBips) * 100,
        delinquencyGracePeriod:
          Number(marketParams.delinquencyGracePeriod) * 60 * 60,
        withdrawalBatchDuration:
          Number(marketParams.withdrawalBatchDuration) * 60 * 60,
        maxTotalSupply: marketParams.maxTotalSupply,
        assetData: tokenAsset,
        depositAccess: marketParams.depositRequiresAccess
          ? DepositAccess.RequiresCredential
          : DepositAccess.Open,
        withdrawalAccess: marketParams.withdrawalRequiresAccess
          ? WithdrawalAccess.RequiresCredential
          : WithdrawalAccess.Open,
        // eslint-disable-next-line no-nested-ternary
        transferAccess: marketParams.disableTransfers
          ? TransferAccess.Disabled
          : marketParams.transferRequiresAccess
            ? TransferAccess.RequiresCredential
            : TransferAccess.Open,
        hooksTemplate: selectedHooksTemplate,
        hooksInstanceName: marketParams.policyName,
        salt: `0x${randomSaltNumber.padStart(64, "0")}`, // @todo use # of deployed markets
        hooksAddress: selectedHooksInstance?.address,
        // @todo proper solution
        existingProviders:
          marketParams.accessControl === "defaultPullProvider"
            ? [
                {
                  providerAddress: "0x9aCdE253F7A51456c48604185C0ceA4Fc9e58E3a",
                  timeToLive: 2 ** 32 - 1,
                },
              ]
            : [],
        allowClosureBeforeTerm: !!marketParams.allowClosureBeforeTerm,
        allowForceBuyBacks: !!marketParams.allowForceBuyBack,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fixedTermEndTime: marketParams.fixedTermEndTime as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        allowTermReduction: marketParams.allowTermReduction as any,

        newProviderInputs: [],
        roleProviderFactory: constants.AddressZero,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    }
  })

  const newMarketStep = useAppSelector(
    (state) => state.routing.routes.newMarketFlow.currentStep,
  )

  const hideLegalInfoStep = useAppSelector(
    (state) => state.routing.hideInfoStep,
  )

  useEffect(() => {
    dispatch(setCurrentFlow("newMarketFlow"))
    dispatch(setCurrentStep(STEPS_NAME.marketDescription))
  }, [])

  switch (newMarketStep) {
    case newMarketSteps.marketDescription.name: {
      return (
        <Box sx={ContentContainer}>
          <NewMarketForm
            form={newMarketForm}
            tokenAsset={tokenAsset}
            policyOptions={policyOptions}
          />
        </Box>
      )
    }

    case newMarketSteps.legalInformation.name: {
      return (
        <Box sx={ContentContainer}>
          <LegalInfoForm form={legalInfoForm} />
        </Box>
      )
    }

    case newMarketSteps.confirmation.name: {
      return (
        <Box sx={ContentContainer}>
          {hideLegalInfoStep ? (
            <NewMarketForm
              form={newMarketForm}
              tokenAsset={tokenAsset}
              policyOptions={policyOptions}
            />
          ) : (
            <LegalInfoForm form={legalInfoForm} />
          )}
          <ConfirmationModal
            open={newMarketStep === newMarketSteps.confirmation.name}
            tokenAsset={tokenAsset}
            getMarketValues={newMarketForm.getValues}
            handleDeployMarket={handleDeployMarket}
            isLoading={isLoading}
            isError={isError}
            isSuccess={isSuccess}
          />
        </Box>
      )
    }

    default: {
      return (
        <Box sx={ContentContainer}>
          <NewMarketForm
            form={newMarketForm}
            tokenAsset={tokenAsset}
            policyOptions={policyOptions}
          />
        </Box>
      )
    }
  }
}
