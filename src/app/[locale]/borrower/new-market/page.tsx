"use client"

import { useEffect } from "react"

import { Box } from "@mui/material"

import { useNewMarketForm } from "@/app/[locale]/borrower/new-market/hooks/useNewMarketForm"
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

export default function NewMarket() {
  const dispatch = useAppDispatch()

  const newMarketForm = useNewMarketForm()

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
          <LegalInfoForm />
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
            <NewMarketForm form={newMarketForm} />
          ) : (
            <LegalInfoForm />
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
