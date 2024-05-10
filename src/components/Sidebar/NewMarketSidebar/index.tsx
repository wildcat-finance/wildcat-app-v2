"use client"

import { Box, Button } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import Link from "next/link"

import {
  BackButton,
  BackButtonIcon,
  ContentContainer,
  MenuItemButton,
  MenuItemButtonSelected,
} from "@/components/Sidebar/NewMarketSidebar/style"
import { ROUTES } from "@/routes"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { STEPS_NAME } from "@/store/slices/routingSlice/flowsSteps"
import { setCurrentStep } from "@/store/slices/routingSlice/routingSlice"

import BackArrow from "../../../assets/icons/backArrow_icon.svg"

export const NewMarketSidebar = () => {
  const dispatch = useAppDispatch()

  const newMarketStep = useAppSelector(
    (state) => state.routing.routes.newMarketFlow.currentStep,
  )

  const hideLegalInfoStep = useAppSelector(
    (state) => state.routing.hideInfoStep,
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
      <Link href={ROUTES.borrower.root} passHref>
        <Button fullWidth variant="text" size="medium" sx={BackButton}>
          <SvgIcon fontSize="small" sx={BackButtonIcon}>
            <BackArrow />
          </SvgIcon>
          To Markets
        </Button>
      </Link>

      <Box display="flex" flexDirection="column" rowGap="4px" width="100%">
        <Button
          variant="text"
          size="medium"
          sx={checkButtonStyle(STEPS_NAME.marketDescription)}
          onClick={handleClickDescription}
        >
          Market Description
        </Button>
        {!hideLegalInfoStep && (
          <Button
            variant="text"
            size="medium"
            sx={checkButtonStyle(STEPS_NAME.legalInformation)}
            onClick={handleClickInformation}
          >
            Legal Info
          </Button>
        )}
        <Button
          variant="text"
          size="medium"
          sx={checkButtonStyle(STEPS_NAME.confirmation)}
        >
          Confirmation
        </Button>
      </Box>
    </Box>
  )
}
