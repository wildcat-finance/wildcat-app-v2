import { useEffect } from "react"

import {
  Box,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
} from "@mui/material"
import { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { FormFooter } from "@/app/[locale]/borrower/create-market/components/FormFooter"
import { FormContainer } from "@/app/[locale]/borrower/create-market/components/Forms/style"
import { MarketValidationSchemaType } from "@/app/[locale]/borrower/new-market/validation/validationSchema"
import ExtendedRadio from "@/components/@extended/ExtendedRadio"
import { HorizontalInputLabel } from "@/components/HorisontalInputLabel"
import { mockedMLATemplatesOptions } from "@/mocks/mocks"
import { useAppDispatch } from "@/store/hooks"
import {
  CreateMarketSteps,
  setCreatingStep,
  setIsDisabled,
  setIsValid,
} from "@/store/slices/createMarketSidebarSlice/createMarketSidebarSlice"
import { COLORS } from "@/theme/colors"

export type MLAFormProps = {
  form: UseFormReturn<MarketValidationSchemaType>
}

export const MlaForm = ({ form }: MLAFormProps) => {
  const {
    setValue,
    register,
    formState: { errors },
    watch,
  } = form

  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const handleNextClick = () => {
    dispatch(setCreatingStep(CreateMarketSteps.FINANCIAL))
  }

  const handleBackClick = () => {
    dispatch(setCreatingStep(CreateMarketSteps.BASIC))
  }

  const mlaWatch = watch("mla")

  const handleChangeMla = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue("mla", event.target.value)
  }

  useEffect(() => {
    dispatch(setIsValid({ step: CreateMarketSteps.MLA, valid: !!mlaWatch }))

    if (mlaWatch) {
      dispatch(
        setIsDisabled({
          steps: [CreateMarketSteps.FINANCIAL],
          disabled: !mlaWatch,
        }),
      )
    }
  }, [mlaWatch])

  return (
    <Box sx={FormContainer}>
      <Typography variant="title2" sx={{ marginBottom: "36px" }}>
        Loan Agreement
      </Typography>

      <HorizontalInputLabel label="Master Loan Agreement" explainer="Explainer">
        <RadioGroup
          aria-labelledby="mla-label"
          name="mla"
          value={mlaWatch}
          onChange={handleChangeMla}
          sx={{
            width: "50%",
            gap: "6px",
          }}
        >
          {mockedMLATemplatesOptions.map((mla) => (
            <FormControlLabel
              key={mla.id}
              label={mla.label}
              control={
                <ExtendedRadio value={mla.value} onChange={handleChangeMla} />
              }
              sx={{
                width: "100%",
                height: "44px",
                border: `1px solid ${COLORS.whiteLilac}`,
                borderRadius: "8px",
                padding: "0 15px",
                display: "flex",
                alignItems: "center",
              }}
            />
          ))}
        </RadioGroup>
      </HorizontalInputLabel>

      <FormFooter
        backOnClick={handleBackClick}
        nextOnClick={handleNextClick}
        disableNext={!mlaWatch}
      />
    </Box>
  )
}
