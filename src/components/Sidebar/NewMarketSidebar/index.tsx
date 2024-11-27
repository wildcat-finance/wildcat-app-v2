"use client"

import { Box, Button } from "@mui/material"
import { useTranslation } from "react-i18next"

import { BackButton } from "@/components/BackButton"
import {
  ContentContainer,
  MenuItemButton,
  MenuItemButtonSelected,
} from "@/components/Sidebar/style"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { STEPS_NAME } from "@/store/slices/routingSlice/flowsSteps"
import { setCurrentStep } from "@/store/slices/routingSlice/routingSlice"

export const NewMarketSidebar = () => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const newMarketStep = useAppSelector(
    (state) => state.routing.routes.newMarketFlow.currentStep,
  )

  const hideLegalInfoStep = useAppSelector(
    (state) => state.routing.hideInfoStep,
  )

  const disableInfoStepButton = useAppSelector(
    (state) => state.routing.disableInfoStepSidebar,
  )

  const disableConfirmationStepButton = useAppSelector(
    (state) => state.routing.disableConfirmationStepSidebar,
  )

  const handleClickDescription = () => {
    dispatch(setCurrentStep(STEPS_NAME.marketDescription))
  }

  const handleClickInformation = () => {
    dispatch(setCurrentStep(STEPS_NAME.legalInformation))
  }

  const checkButtonStyle = (stepName: string) => {
    if (stepName === newMarketStep) {
      return MenuItemButtonSelected
    }
    return MenuItemButton
  }

  return (
    <Box sx={ContentContainer}>
      <BackButton title={t("createMarket.sidebar.back")} />

      <Box display="flex" flexDirection="column" rowGap="4px" width="100%">
        <Button
          variant="text"
          size="medium"
          sx={checkButtonStyle(STEPS_NAME.marketDescription)}
          onClick={handleClickDescription}
        >
          {t("createMarket.sidebar.marketDescription")}
        </Button>
        {!hideLegalInfoStep && (
          <Button
            variant="text"
            size="medium"
            sx={checkButtonStyle(STEPS_NAME.legalInformation)}
            onClick={handleClickInformation}
            disabled={disableInfoStepButton}
          >
            {t("createMarket.sidebar.legalInfo")}
          </Button>
        )}
        <Button
          variant="text"
          size="medium"
          sx={checkButtonStyle(STEPS_NAME.confirmation)}
          disabled={disableConfirmationStepButton}
        >
          {t("createMarket.sidebar.confirm")}
        </Button>
      </Box>
    </Box>
  )
}
