import { useEffect } from "react"

import { Box, Typography } from "@mui/material"
import { Token } from "@wildcatfi/wildcat-sdk"
import { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { FormFooter } from "@/app/[locale]/borrower/create-market/components/FormFooter"
import {
  FormContainer,
  SectionGrid,
} from "@/app/[locale]/borrower/create-market/components/Forms/style"
import { endDecorator } from "@/app/[locale]/borrower/new-market/components/NewMarketForm/style"
import { MarketValidationSchemaType } from "@/app/[locale]/borrower/new-market/validation/validationSchema"
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

export type FinancialFormProps = {
  form: UseFormReturn<MarketValidationSchemaType>
  tokenAsset: Token | undefined
}

export const FinancialForm = ({ form, tokenAsset }: FinancialFormProps) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const handleNextClick = () => {
    dispatch(setCreatingStep(CreateMarketSteps.LRESTRICTIONS))
  }

  const handleBackClick = () => {
    dispatch(setCreatingStep(CreateMarketSteps.MLA))
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

  const isFormValid =
    !!capacityWatch &&
    !errors.maxTotalSupply &&
    !!baseAprWatch &&
    !errors.annualInterestBips &&
    !!penaltyAprWatch &&
    !errors.delinquencyFeeBips &&
    !!ratioWatch &&
    !errors.reserveRatioBips

  useEffect(() => {
    dispatch(
      setIsValid({ step: CreateMarketSteps.FINANCIAL, valid: isFormValid }),
    )

    if (isFormValid) {
      dispatch(
        setIsDisabled({
          steps: [
            CreateMarketSteps.LRESTRICTIONS,
            CreateMarketSteps.BRESTRICTIONS,
            CreateMarketSteps.PERIODS,
          ],
          disabled: !isFormValid,
        }),
      )
    } else {
      const allStepsToDisable = [
        CreateMarketSteps.BRESTRICTIONS,
        CreateMarketSteps.CONFIRM,
        CreateMarketSteps.LRESTRICTIONS,
        CreateMarketSteps.PERIODS,
      ]

      dispatch(setIsDisabled({ steps: allStepsToDisable, disabled: true }))
    }
  }, [isFormValid])

  return (
    <Box sx={FormContainer}>
      <Typography variant="title2" sx={{ marginBottom: "36px" }}>
        Financial Terms
      </Typography>

      <Box
        sx={{
          ...SectionGrid,
          gap: "38px 10px",
        }}
      >
        <InputLabel
          label={t("createMarket.forms.marketDescription.block.capacity.title")}
        >
          <NumberTextField
            label={t(
              "createMarket.forms.marketDescription.block.capacity.placeholder",
            )}
            value={getValues("maxTotalSupply")}
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
                  `${t(
                    "createMarket.forms.marketDescription.block.capacity.chip",
                  )}`
                }
              />
            }
          />
        </InputLabel>

        <InputLabel
          label={t("createMarket.forms.marketDescription.block.baseAPR.title")}
        >
          <NumberTextField
            min={0}
            max={100}
            label={t(
              "createMarket.forms.marketDescription.block.baseAPR.placeholder",
            )}
            value={getValues("annualInterestBips")}
            error={Boolean(errors.annualInterestBips)}
            helperText={errors.annualInterestBips?.message}
            endAdornment={
              <Typography variant="text2" sx={endDecorator}>
                {t("createMarket.forms.marketDescription.block.baseAPR.chip")}
              </Typography>
            }
            {...register("annualInterestBips")}
          />
        </InputLabel>

        <InputLabel
          label={t(
            "createMarket.forms.marketDescription.block.penaltyAPR.title",
          )}
        >
          <NumberTextField
            min={0}
            max={100}
            label={t(
              "createMarket.forms.marketDescription.block.penaltyAPR.placeholder",
            )}
            value={getValues("delinquencyFeeBips")}
            error={Boolean(errors.delinquencyFeeBips)}
            helperText={errors.delinquencyFeeBips?.message}
            endAdornment={
              <Typography variant="text2" sx={endDecorator}>
                {t(
                  "createMarket.forms.marketDescription.block.penaltyAPR.chip",
                )}
              </Typography>
            }
            {...register("delinquencyFeeBips")}
          />
        </InputLabel>

        <InputLabel
          label={t("createMarket.forms.marketDescription.block.ratio.title")}
        >
          <NumberTextField
            label={t(
              "createMarket.forms.marketDescription.block.ratio.placeholder",
            )}
            min={0}
            max={100}
            value={getValues("reserveRatioBips")}
            error={Boolean(errors.reserveRatioBips)}
            helperText={errors.reserveRatioBips?.message}
            endAdornment={
              <Typography variant="text2" sx={endDecorator}>
                {t("createMarket.forms.marketDescription.block.ratio.chip")}
              </Typography>
            }
            {...register("reserveRatioBips")}
          />
        </InputLabel>
      </Box>

      <InputLabel
        label={t("createMarket.forms.marketDescription.block.deposit.title")}
        subtitle={t(
          "createMarket.forms.marketDescription.block.deposit.subtitle",
        )}
        margin="36px 0 0 0"
      >
        <NumberTextField
          label="0"
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
                `${t(
                  "createMarket.forms.marketDescription.block.deposit.chip",
                )}`
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
