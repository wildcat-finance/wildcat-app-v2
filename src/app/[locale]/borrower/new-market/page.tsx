"use client"

import { useEffect } from "react"

import { Box } from "@mui/material"

import { ConfirmationModal } from "@/app/[locale]/borrower/new-market/components/ConfirmationModal"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  newMarketSteps,
  STEPS_NAME,
} from "@/store/slices/routingSlice/flowsSteps"
import {
  setCurrentFlow,
  setCurrentStep,
} from "@/store/slices/routingSlice/routingSlice"

import { LegalInfoForm } from "./components/LegalInfoForm"
import { NewMarketForm } from "./components/NewMarketForm"
import { useLegalInfoForm } from "./hooks/useLegalInfoForm"
import { useNewMarketForm } from "./hooks/useNewMarketForm"

export default function NewMarket() {
  const dispatch = useAppDispatch()

  const newMarketForm = useNewMarketForm()
  const legalInfoForm = useLegalInfoForm()

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
        <Box
          padding="40px 367px 52px 100px"
          display="flex"
          justifyContent="space-around"
        >
          <NewMarketForm form={newMarketForm} />
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
            <>
              <ConfirmationModal
                open={newMarketStep === newMarketSteps.confirmation.name}
                getMarketValues={newMarketForm.getValues}
              />
              <NewMarketForm form={newMarketForm} />
            </>
          ) : (
            <>
              <ConfirmationModal
                open={newMarketStep === newMarketSteps.confirmation.name}
                getMarketValues={newMarketForm.getValues}
                getInfoValues={legalInfoForm.getValues}
              />
              <LegalInfoForm form={legalInfoForm} />
            </>
          )}
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
          <NewMarketForm form={newMarketForm} />
        </Box>
      )
    }
  }
}
