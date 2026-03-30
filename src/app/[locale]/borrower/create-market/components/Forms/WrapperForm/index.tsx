import { useEffect } from "react"

import { Box, Switch, Typography } from "@mui/material"
import { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { FormFooter } from "@/app/[locale]/borrower/create-market/components/FormFooter"
import { FormContainer } from "@/app/[locale]/borrower/create-market/components/Forms/style"
import { MarketValidationSchemaType } from "@/app/[locale]/borrower/create-market/validation/validationSchema"
import { HorizontalInputLabel } from "@/components/HorisontalInputLabel"
import { useAppDispatch } from "@/store/hooks"
import {
  CreateMarketSteps,
  setCreatingStep,
  setIsDisabled,
  setIsValid,
} from "@/store/slices/createMarketSidebarSlice/createMarketSidebarSlice"

export const WrapperForm = ({
  form,
}: {
  form: UseFormReturn<MarketValidationSchemaType>
}) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const { setValue, watch } = form

  const deployWrapper = watch("deployWrapper")

  const handleNextClick = () => {
    dispatch(setCreatingStep(CreateMarketSteps.MLA))
  }

  const handleBackClick = () => {
    dispatch(setCreatingStep(CreateMarketSteps.LRESTRICTIONS))
  }

  useEffect(() => {
    dispatch(setIsValid({ step: CreateMarketSteps.WRAPPER, valid: true }))
    dispatch(
      setIsDisabled({
        steps: [CreateMarketSteps.WRAPPER],
        disabled: false,
      }),
    )
  }, [])

  return (
    <Box sx={FormContainer}>
      <Typography variant="title2" sx={{ marginBottom: "36px" }}>
        {t("createNewMarket.wrapper.title")}
      </Typography>

      <HorizontalInputLabel
        label={t("createNewMarket.wrapper.deploy.label")}
        explainer={t("createNewMarket.wrapper.deploy.explainer")}
      >
        <Switch
          checked={deployWrapper}
          onChange={(e) => {
            setValue("deployWrapper", e.target.checked)
          }}
        />
      </HorizontalInputLabel>

      <FormFooter
        backOnClick={handleBackClick}
        nextOnClick={handleNextClick}
        disableNext={false}
      />
    </Box>
  )
}
