"use client"

import { useEffect, useState } from "react"

import { Box } from "@mui/material"
import { Token } from "@wildcatfi/wildcat-sdk"
import { useRouter } from "next/navigation"
import { useAccount } from "wagmi"

import { useDeployMarket } from "@/app/[locale]/borrower/new-market/hooks/useDeployMarket"
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

export default function NewMarket() {
  const dispatch = useAppDispatch()
  const { isConnected } = useAccount()
  const router = useRouter()

  const newMarketForm = useNewMarketForm()
  const legalInfoForm = useLegalInfoForm()

  const { isLoading: isControllerLoading } = useGetController()
  const { deployNewMarket, isDeploying, isSuccess, isError } = useDeployMarket()

  const isLoading = isControllerLoading || isDeploying

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

    if (assetData && tokenAsset) {
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
      })
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

  useEffect(() => {
    if (!isConnected) {
      router.push("/")
    }
  }, [isConnected])

  switch (newMarketStep) {
    case newMarketSteps.marketDescription.name: {
      return (
        <Box
          padding="40px 367px 52px 100px"
          display="flex"
          justifyContent="space-around"
        >
          <NewMarketForm form={newMarketForm} tokenAsset={tokenAsset} />
        </Box>
      )
    }

    case newMarketSteps.legalInformation.name: {
      return (
        <Box
          padding="40px 367px 52px 100px"
          display="flex"
          justifyContent="space-around"
        >
          <LegalInfoForm form={legalInfoForm} />
        </Box>
      )
    }

    case newMarketSteps.confirmation.name: {
      return (
        <Box
          padding="40px 367px 52px 100px"
          display="flex"
          justifyContent="space-around"
        >
          {hideLegalInfoStep ? (
            <NewMarketForm form={newMarketForm} tokenAsset={tokenAsset} />
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
        <Box
          padding="40px 367px 52px 100px"
          display="flex"
          justifyContent="space-around"
        >
          <NewMarketForm form={newMarketForm} tokenAsset={tokenAsset} />
        </Box>
      )
    }
  }
}
