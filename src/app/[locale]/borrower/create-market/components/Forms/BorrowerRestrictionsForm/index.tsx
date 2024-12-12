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
        Borrower Restrictions
      </Typography>

      <Typography
        variant="text3"
        color={COLORS.santasGrey}
        sx={{ marginBottom: "36px" }}
      >
        This is your opportunity to encourage confidence from your lenders
      </Typography>

      <HorizontalInputLabel
        label="Allow Force Buybacks"
        explainer="Defines whether the borrower can forcibly buy back debt tokens from lenders."
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
              This will break integration with on-chain exchanges.
            </Typography>
            <Typography variant="text4" color={COLORS.dullRed08}>
              Lenders will see a warning about using this market with smart
              contracts.
            </Typography>
          </Box>

          <Button variant="outlined" size="small" sx={MoreInfoButton}>
            More Info
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
