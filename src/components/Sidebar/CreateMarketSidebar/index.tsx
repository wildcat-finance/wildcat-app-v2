import { Box, Button, SvgIcon, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import Check from "@/assets/icons/check_icon.svg"
import { BackButton } from "@/components/BackButton"
import { ContentContainer } from "@/components/Sidebar/style"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  CreateMarketSteps,
  setCreatingStep,
} from "@/store/slices/createMarketSidebarSlice/createMarketSidebarSlice"
import { COLORS } from "@/theme/colors"

export type CreateMarketSidebarButtonProps = {
  number?: number
  title: string
  state?: "active" | "opened"
  disabled: boolean
  valid?: boolean
  onClick: () => void
}

export const CreateMarketSidebarButton = ({
  number,
  title,
  state = "opened",
  disabled,
  valid,
  onClick,
}: CreateMarketSidebarButtonProps) => {
  const { t } = useTranslation()

  let buttonConfig: {
    numberColor: string
    titleColor: string
    backgroundColor: string
  }

  switch (state) {
    case "active": {
      buttonConfig = {
        numberColor: COLORS.ultramarineBlue,
        titleColor: COLORS.ultramarineBlue,
        backgroundColor: COLORS.blueRibbon01,
      }
      break
    }
    case "opened": {
      buttonConfig = {
        numberColor: COLORS.greySuit,
        titleColor: COLORS.blackRock,
        backgroundColor: "transparent",
      }
      break
    }
    default: {
      buttonConfig = {
        numberColor: COLORS.greySuit,
        titleColor: COLORS.blackRock,
        backgroundColor: "transparent",
      }
      break
    }
  }

  return (
    <Button
      onClick={onClick}
      sx={{
        width: "100%",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px",

        "&.MuiButtonBase-root.MuiButton-root.Mui-disabled": {
          opacity: 1,
        },
      }}
      disabled={disabled}
    >
      <Box sx={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            backgroundColor: number
              ? buttonConfig.backgroundColor
              : "transparent",
          }}
        >
          <Typography variant="text3" color={buttonConfig.numberColor}>
            {number}
          </Typography>
        </Box>

        <Typography
          variant="text3"
          color={!disabled ? buttonConfig.titleColor : COLORS.greySuit}
        >
          {t(title)}
        </Typography>
      </Box>

      {valid && (
        <SvgIcon sx={{ "& path": { fill: COLORS.greySuit } }}>
          <Check />
        </SvgIcon>
      )}
    </Button>
  )
}

export const CreateMarketSidebar = () => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const currentStep = useAppSelector(
    (state) => state.createMarketSidebar.currentStep,
  )
  const steps = useAppSelector((state) => state.createMarketSidebar.steps)

  const handleSetStep = (step: CreateMarketSteps) => {
    dispatch(setCreatingStep(step))
  }

  return (
    <Box sx={ContentContainer}>
      <BackButton title={t("createNewMarket.buttons.sidebar")} />

      <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {steps.map((step) => (
          <CreateMarketSidebarButton
            key={step.step}
            number={step.number}
            title={step.title}
            state={step.step === currentStep ? "active" : "opened"}
            valid={step.valid}
            onClick={() => handleSetStep(step.step)}
            disabled={step.disabled}
          />
        ))}
      </Box>
    </Box>
  )
}
