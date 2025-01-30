import { useEffect } from "react"

import { Box, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { endDecorator } from "@/app/[locale]/borrower/(new-market)/components/NewMarketForm/style"
import { InputLabel } from "@/components/InputLabel"
import { NumberTextField } from "@/components/NumberTextfield"
import { TextfieldChip } from "@/components/TextfieldAdornments/TextfieldChip"
import { useAppDispatch } from "@/store/hooks"
import {
  CreateMarketSteps,
  setCreatingStep,
  setIsDisabled,
  setIsValid,
} from "@/store/slices/createMarketSidebarSlice/createMarketSidebarSlice"
import { COLORS } from "@/theme/colors"

import { FinancialFormProps } from "./interface"
import { FormFooter } from "../../FormFooter"
import { FormContainer, SectionGrid } from "../style"

export const FinancialForm = ({ form, tokenAsset }: FinancialFormProps) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const handleNextClick = () => {
    dispatch(setCreatingStep(CreateMarketSteps.LRESTRICTIONS))
  }

  const handleBackClick = () => {
    dispatch(setCreatingStep(CreateMarketSteps.BASIC))
  }

  const {
    getValues,
    setValue,
    register,
    formState: { errors },
    watch,
  } = form

  const capacityWatch = watch("maxTotalSupply")
  const baseAprWatch = watch("annualInterestBips")
  const penaltyAprWatch = watch("delinquencyFeeBips")
  const ratioWatch = watch("reserveRatioBips")
  const delinquencyGracePeriodWatch = watch("delinquencyGracePeriod")
  const withdrawalBatchDurationWatch = watch("withdrawalBatchDuration")

  const isFormValid =
    !!capacityWatch &&
    !errors.maxTotalSupply &&
    !!baseAprWatch &&
    !errors.annualInterestBips &&
    !!penaltyAprWatch &&
    !errors.delinquencyFeeBips &&
    !!ratioWatch &&
    !errors.reserveRatioBips &&
    !!delinquencyGracePeriodWatch &&
    !errors.delinquencyGracePeriod &&
    !!withdrawalBatchDurationWatch &&
    !errors.withdrawalBatchDuration

  useEffect(() => {
    dispatch(
      setIsValid({ step: CreateMarketSteps.FINANCIAL, valid: isFormValid }),
    )

    if (isFormValid) {
      dispatch(
        setIsDisabled({
          steps: [CreateMarketSteps.LRESTRICTIONS],
          disabled: !isFormValid,
        }),
      )
    } else {
      const allStepsToDisable = [
        CreateMarketSteps.CONFIRM,
        CreateMarketSteps.LRESTRICTIONS,
      ]

      dispatch(setIsDisabled({ steps: allStepsToDisable, disabled: true }))
    }
  }, [isFormValid])

  return (
    <Box sx={FormContainer}>
      <Typography variant="title2" sx={{ marginBottom: "36px" }}>
        {t("createNewMarket.financial.title")}
      </Typography>

      <Box
        sx={{
          ...SectionGrid,
          gap: "38px 10px",
        }}
      >
        <InputLabel label={t("createNewMarket.financial.maxCapacity.label")}>
          <NumberTextField
            label={t("createNewMarket.financial.maxCapacity.placeholder")}
            value={getValues("maxTotalSupply")}
            // onBlur={(v) => {
            //   setValue(
            //     "maxTotalSupply",
            //     parseFloat(v.target.value.replaceAll(",", "")) as number,
            //   )
            // }}
            onValueChange={(v) => {
              setValue("maxTotalSupply", v.floatValue as number)
            }}
            error={Boolean(errors.maxTotalSupply)}
            helperText={errors.maxTotalSupply?.message}
            thousandSeparator
            endAdornment={
              <TextfieldChip
                size="regular"
                text={
                  tokenAsset?.symbol ||
                  `${t("createNewMarket.financial.maxCapacity.chip")}`
                }
              />
            }
          />
        </InputLabel>

        <InputLabel label={t("createNewMarket.financial.baseAPR.label")}>
          <NumberTextField
            min={0}
            max={100}
            decimalScale={2}
            label={t("createNewMarket.financial.baseAPR.placeholder")}
            value={getValues("annualInterestBips")}
            error={Boolean(errors.annualInterestBips)}
            helperText={errors.annualInterestBips?.message}
            endAdornment={
              <Typography variant="text2" sx={endDecorator}>
                {t("createNewMarket.financial.baseAPR.chip")}
              </Typography>
            }
            {...register("annualInterestBips")}
          />
        </InputLabel>

        <InputLabel label={t("createNewMarket.financial.penaltyAPR.label")}>
          <NumberTextField
            min={0}
            max={100}
            decimalScale={2}
            label={t("createNewMarket.financial.penaltyAPR.placeholder")}
            value={getValues("delinquencyFeeBips")}
            error={Boolean(errors.delinquencyFeeBips)}
            helperText={errors.delinquencyFeeBips?.message}
            endAdornment={
              <Typography variant="text2" sx={endDecorator}>
                {t("createNewMarket.financial.penaltyAPR.chip")}
              </Typography>
            }
            {...register("delinquencyFeeBips")}
          />
        </InputLabel>

        <InputLabel label={t("createNewMarket.financial.ratio.label")}>
          <NumberTextField
            label={t("createNewMarket.financial.ratio.placeholder")}
            min={0}
            max={100}
            decimalScale={2}
            value={getValues("reserveRatioBips")}
            error={Boolean(errors.reserveRatioBips)}
            helperText={errors.reserveRatioBips?.message}
            endAdornment={
              <Typography variant="text2" sx={endDecorator}>
                {t("createNewMarket.financial.ratio.chip")}
              </Typography>
            }
            {...register("reserveRatioBips")}
          />
        </InputLabel>

        <InputLabel label={t("createNewMarket.periods.grace.label")}>
          <NumberTextField
            decimalScale={2}
            label={t("createNewMarket.periods.grace.placeholder")}
            value={delinquencyGracePeriodWatch}
            error={Boolean(errors.delinquencyGracePeriod)}
            helperText={errors.delinquencyGracePeriod?.message}
            endAdornment={
              <Typography variant="text2" sx={{ color: COLORS.santasGrey }}>
                {t("createNewMarket.periods.grace.chip")}
              </Typography>
            }
            {...register("delinquencyGracePeriod")}
          />
        </InputLabel>

        <InputLabel label={t("createNewMarket.periods.wdCycle.label")}>
          <NumberTextField
            decimalScale={2}
            label={t("createNewMarket.periods.wdCycle.placeholder")}
            value={withdrawalBatchDurationWatch}
            error={Boolean(errors.withdrawalBatchDuration)}
            helperText={errors.withdrawalBatchDuration?.message}
            endAdornment={
              <Typography variant="text2" sx={{ color: COLORS.santasGrey }}>
                {t("createNewMarket.periods.wdCycle.chip")}
              </Typography>
            }
            {...register("withdrawalBatchDuration")}
          />
        </InputLabel>
      </Box>

      <InputLabel
        label={t("createNewMarket.financial.minDeposit.label")}
        subtitle={t("createNewMarket.financial.minDeposit.explainer")}
        margin="36px 0 0 0"
      >
        <NumberTextField
          label={t("createNewMarket.financial.minDeposit.placeholder")}
          max={getValues("maxTotalSupply")}
          value={getValues("minimumDeposit")}
          onValueChange={(v) => {
            setValue("minimumDeposit", (v.floatValue as number) ?? 0)
          }}
          error={Boolean(errors.minimumDeposit)}
          helperText={errors.minimumDeposit?.message}
          thousandSeparator
          style={{ maxWidth: "50%" }}
          endAdornment={
            <TextfieldChip
              size="regular"
              text={
                tokenAsset?.symbol ||
                `${t("createNewMarket.financial.minDeposit.chip")}`
              }
            />
          }
        />
      </InputLabel>

      <FormFooter
        backOnClick={handleBackClick}
        nextOnClick={handleNextClick}
        disableNext={!isFormValid}
      />
    </Box>
  )
}
