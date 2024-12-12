import { useEffect } from "react"

import { Box, Typography } from "@mui/material"
import { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { FormFooter } from "@/app/[locale]/borrower/create-market/components/FormFooter"
import {
  FormContainer,
  SectionGrid,
} from "@/app/[locale]/borrower/create-market/components/Forms/style"
import { MarketValidationSchemaType } from "@/app/[locale]/borrower/create-market/validation/validationSchema"
import { InputLabel } from "@/components/InputLabel"
import { NumberTextField } from "@/components/NumberTextfield"
import { useAppDispatch } from "@/store/hooks"
import {
  CreateMarketSteps,
  setCreatingStep,
  setIsDisabled,
  setIsValid,
} from "@/store/slices/createMarketSidebarSlice/createMarketSidebarSlice"
import { COLORS } from "@/theme/colors"

export type PeriodsFormProps = {
  form: UseFormReturn<MarketValidationSchemaType>
}

export const PeriodsForm = ({ form }: PeriodsFormProps) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const {
    register,
    formState: { errors },
    watch,
  } = form

  const delinquencyGracePeriodWatch = watch("delinquencyGracePeriod")
  const withdrawalBatchDurationWatch = watch("withdrawalBatchDuration")

  const isFormValid =
    !!delinquencyGracePeriodWatch &&
    !errors.delinquencyGracePeriod &&
    !!withdrawalBatchDurationWatch &&
    !errors.withdrawalBatchDuration

  const handleNextClick = () => {
    dispatch(setCreatingStep(CreateMarketSteps.CONFIRM))
  }

  const handleBackClick = () => {
    dispatch(setCreatingStep(CreateMarketSteps.BRESTRICTIONS))
  }

  useEffect(() => {
    dispatch(
      setIsValid({ step: CreateMarketSteps.PERIODS, valid: isFormValid }),
    )

    if (isFormValid) {
      dispatch(
        setIsDisabled({
          steps: [CreateMarketSteps.CONFIRM],
          disabled: !isFormValid,
        }),
      )
    } else {
      const allStepsToDisable = [CreateMarketSteps.CONFIRM]

      dispatch(setIsDisabled({ steps: allStepsToDisable, disabled: true }))
    }
  }, [isFormValid])

  return (
    <Box sx={FormContainer}>
      <Typography variant="title2" sx={{ marginBottom: "36px" }}>
        Grace and Withdrawal Periods
      </Typography>

      <Box
        sx={{
          ...SectionGrid,
          gap: "38px 10px",
          gridTemplateRows: "repeat(1, 1fr)",
        }}
      >
        <InputLabel
          label={t(
            "createMarket.forms.marketDescription.block.gracePeriod.title",
          )}
          tooltipText={t(
            "createMarket.forms.marketDescription.block.gracePeriod.tooltip",
          )}
        >
          <NumberTextField
            label={t(
              "createMarket.forms.marketDescription.block.gracePeriod.placeholder",
            )}
            value={delinquencyGracePeriodWatch}
            error={Boolean(errors.delinquencyGracePeriod)}
            helperText={errors.delinquencyGracePeriod?.message}
            endAdornment={
              <Typography variant="text2" sx={{ color: COLORS.santasGrey }}>
                {t(
                  "createMarket.forms.marketDescription.block.gracePeriod.chip",
                )}
              </Typography>
            }
            {...register("delinquencyGracePeriod")}
          />
        </InputLabel>

        <InputLabel
          label={t(
            "createMarket.forms.marketDescription.block.withdrawalCycle.title",
          )}
          tooltipText={t(
            "createMarket.forms.marketDescription.block.withdrawalCycle.tooltip",
          )}
        >
          <NumberTextField
            label={t(
              "createMarket.forms.marketDescription.block.withdrawalCycle.placeholder",
            )}
            value={withdrawalBatchDurationWatch}
            error={Boolean(errors.withdrawalBatchDuration)}
            helperText={errors.withdrawalBatchDuration?.message}
            endAdornment={
              <Typography variant="text2" sx={{ color: COLORS.santasGrey }}>
                {t(
                  "createMarket.forms.marketDescription.block.withdrawalCycle.chip",
                )}
              </Typography>
            }
            {...register("withdrawalBatchDuration")}
          />
        </InputLabel>
      </Box>

      <FormFooter
        backOnClick={handleBackClick}
        nextOnClick={handleNextClick}
        disableNext={!isFormValid}
      />
    </Box>
  )
}
