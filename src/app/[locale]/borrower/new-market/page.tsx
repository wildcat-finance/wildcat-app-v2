"use client"

import { useEffect } from "react"

import { Box } from "@mui/material"

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

  const newMarketStep = useAppSelector(
    (state) => state.routing.routes.newMarketFlow.currentStep,
  )

  useEffect(() => {
    dispatch(setCurrentFlow("newMarketFlow"))
    dispatch(setCurrentStep(STEPS_NAME.marketDescription))
  }, [])

  switch (newMarketStep) {
    case newMarketSteps.marketDescription.name: {
      return (
        <Box padding="38px 366px 52px 101px">
          <NewMarketForm />
        </Box>
      )
    }

    case newMarketSteps.legalInformation.name ||
      newMarketSteps.confirmation.name: {
      return (
        <Box padding="38px 366px 52px 101px">
          <LegalInfoForm />
        </Box>
      )
    }

    case newMarketSteps.confirmation.name: {
      return (
        <Box padding="38px 366px 52px 101px">
          <LegalInfoForm />
        </Box>
      )
    }

    default: {
      return (
        <Box padding="38px 366px 52px 101px">
          <NewMarketForm />
        </Box>
      )
    }
  }
}
