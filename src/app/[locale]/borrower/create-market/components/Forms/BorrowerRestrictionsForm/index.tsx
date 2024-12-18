import { useEffect } from "react"

import { Box, Button, Switch, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { HorizontalInputLabel } from "@/components/HorisontalInputLabel"
import { useAppDispatch } from "@/store/hooks"
import {
  CreateMarketSteps,
  setCreatingStep,
  setIsDisabled,
  setIsValid,
} from "@/store/slices/createMarketSidebarSlice/createMarketSidebarSlice"
import { COLORS } from "@/theme/colors"

import { BorrowerRestrictionsFormProps } from "./interface"
import {
  AlertContainer,
  MoreInfoButton,
  SwitchStyle,
  TextContainer,
} from "./style"
import { FormFooter } from "../../FormFooter"
import { FormContainer } from "../style"

export const BorrowerRestrictionsForm = ({
  form,
}: BorrowerRestrictionsFormProps) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const { setValue, watch } = form

  const allowForceBuyBackWatch = watch("allowForceBuyBack")

  const handleNextClick = () => {
    dispatch(setCreatingStep(CreateMarketSteps.PERIODS))
  }

  const handleBackClick = () => {
    dispatch(setCreatingStep(CreateMarketSteps.LRESTRICTIONS))
  }

  useEffect(() => {
    dispatch(setIsValid({ step: CreateMarketSteps.BRESTRICTIONS, valid: true }))
    dispatch(
      setIsDisabled({
        steps: [CreateMarketSteps.PERIODS],
        disabled: false,
      }),
    )
  }, [])

  return (
    <Box sx={FormContainer}>
      <Typography variant="title2" sx={{ marginBottom: "8px" }}>
        {t("createNewMarket.borrowerRestrictions.title")}
      </Typography>

      <Typography
        variant="text3"
        color={COLORS.santasGrey}
        sx={{ marginBottom: "36px" }}
      >
        {t("createNewMarket.borrowerRestrictions.subtitle")}
      </Typography>

      <HorizontalInputLabel
        label={t("createNewMarket.borrowerRestrictions.buybacks.label")}
        explainer={t("createNewMarket.borrowerRestrictions.buybacks.explainer")}
      >
        <Switch
          checked={allowForceBuyBackWatch}
          onChange={(e) => {
            setValue("allowForceBuyBack", e.target.checked)
          }}
          sx={SwitchStyle}
        />
      </HorizontalInputLabel>

      {allowForceBuyBackWatch && (
        <Box sx={AlertContainer}>
          <Box sx={TextContainer}>
            <Typography variant="text2" color={COLORS.dullRed}>
              {t("createNewMarket.borrowerRestrictions.alert.title")}
            </Typography>
            <Typography variant="text4" color={COLORS.dullRed08}>
              {t("createNewMarket.borrowerRestrictions.alert.subtitle")}
            </Typography>
          </Box>

          <Button variant="outlined" size="small" sx={MoreInfoButton}>
            {t("createNewMarket.borrowerRestrictions.alert.button")}
          </Button>
        </Box>
      )}

      <FormFooter
        backOnClick={handleBackClick}
        nextOnClick={handleNextClick}
        disableNext={false}
      />
    </Box>
  )
}
