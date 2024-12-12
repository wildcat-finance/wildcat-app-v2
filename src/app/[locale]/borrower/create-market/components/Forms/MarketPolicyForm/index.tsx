import { useEffect } from "react"

import { Box, Divider, Switch, TextField, Typography } from "@mui/material"
import { DesktopDatePicker } from "@mui/x-date-pickers"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import dayjs from "dayjs"
import { useRouter } from "next/navigation"
import { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { FormFooter } from "@/app/[locale]/borrower/create-market/components/FormFooter"
import {
  FormContainer,
  SectionGrid,
} from "@/app/[locale]/borrower/create-market/components/Forms/style"
import { DropdownOption } from "@/app/[locale]/borrower/new-market/components/NewMarketForm/style"
import { MarketValidationSchemaType } from "@/app/[locale]/borrower/new-market/validation/validationSchema"
import { ExtendedSelect } from "@/components/@extended/ExtendedSelect"
import { ExtendedSelectOptionItem } from "@/components/@extended/ExtendedSelect/type"
import { HorizontalInputLabel } from "@/components/HorisontalInputLabel"
import { InputLabel } from "@/components/InputLabel"
import {
  mockedAccessControlOptions,
  mockedMarketTypesOptions,
} from "@/mocks/mocks"
import { ROUTES } from "@/routes"
import { useAppDispatch } from "@/store/hooks"
import {
  CreateMarketSteps,
  setCreatingStep,
  setIsDisabled,
  setIsValid,
} from "@/store/slices/createMarketSidebarSlice/createMarketSidebarSlice"
import { COLORS } from "@/theme/colors"

type MarketPolicyFormProps = {
  form: UseFormReturn<MarketValidationSchemaType>
  policyOptions: ExtendedSelectOptionItem[]
}

export const MarketPolicyForm = ({
  form,
  policyOptions,
}: MarketPolicyFormProps) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const router = useRouter()

  const today = dayjs.unix(Date.now() / 1_000).startOf("day")
  const tomorrow = today.add(1, "day")
  const oneYearFromNow = today.add(365, "days")

  const {
    setValue,
    register,
    formState: { errors },
    control,
    watch,
  } = form

  const policyWatch = watch("policy")
  const policyNameWatch = watch("policyName")
  const marketTypeWatch = watch("marketType")
  const accessControlWatch = watch("accessControl")
  const fixedTermEndTimeWatch = watch("fixedTermEndTime")
  const allowClosureBeforeTermWatch = watch("allowClosureBeforeTerm")
  const allowTermReductionWatch = watch("allowTermReduction")

  const isFixedTerm = marketTypeWatch === "fixedTerm"

  const disableFields = !(
    policyWatch === "createNewPolicy" || policyWatch === ""
  )

  const isStandardFormValid =
    !!policyWatch &&
    policyWatch.trim() !== "" &&
    !!policyNameWatch &&
    policyNameWatch.trim() !== "" &&
    !!marketTypeWatch &&
    marketTypeWatch.trim() !== "" &&
    !!accessControlWatch &&
    accessControlWatch.trim() !== ""

  const isFixedFormValid =
    !!policyWatch &&
    policyWatch.trim() !== "" &&
    !!policyNameWatch &&
    policyNameWatch.trim() !== "" &&
    !!marketTypeWatch &&
    marketTypeWatch.trim() !== "" &&
    !!accessControlWatch &&
    accessControlWatch.trim() !== "" &&
    !!fixedTermEndTimeWatch

  const isFormValid = isFixedTerm ? isFixedFormValid : isStandardFormValid

  const handleNextClick = () => {
    dispatch(setCreatingStep(CreateMarketSteps.BASIC))
  }

  const handleBackClick = () => {
    router.push(ROUTES.borrower.root)
  }

  useEffect(() => {
    dispatch(setIsValid({ step: CreateMarketSteps.POLICY, valid: isFormValid }))

    if (isFormValid) {
      dispatch(
        setIsDisabled({ steps: [CreateMarketSteps.BASIC], disabled: false }),
      )
    } else {
      const allStepsToDisable = [
        CreateMarketSteps.BASIC,
        CreateMarketSteps.BRESTRICTIONS,
        CreateMarketSteps.CONFIRM,
        CreateMarketSteps.LRESTRICTIONS,
        CreateMarketSteps.PERIODS,
        CreateMarketSteps.FINANCIAL,
        CreateMarketSteps.MLA,
      ]

      dispatch(setIsDisabled({ steps: allStepsToDisable, disabled: true }))
    }
  }, [isFormValid, isFixedTerm])

  return (
    <Box sx={FormContainer}>
      <Typography variant="title2" sx={{ marginBottom: "36px" }}>
        Market Policy
      </Typography>

      <Box
        sx={{
          ...SectionGrid,
          gap: "38px 10px",
        }}
      >
        <InputLabel
          label={t("createMarket.forms.marketDescription.block.policy.title")}
        >
          <ExtendedSelect
            control={control}
            name="policy"
            label={t(
              "createMarket.forms.marketDescription.block.policy.placeholder",
            )}
            options={policyOptions}
            optionSX={DropdownOption}
          />
        </InputLabel>

        <InputLabel label="Policy Name">
          <TextField
            placeholder={t(
              "createMarket.forms.marketDescription.block.policyName.placeholder",
            )}
            error={Boolean(errors.policyName)}
            helperText={errors.policyName?.message}
            {...register("policyName")}
            disabled={disableFields}
          />
        </InputLabel>

        <InputLabel
          label={t(
            "createMarket.forms.marketDescription.block.marketType.title",
          )}
        >
          <ExtendedSelect
            selectSX={{
              "& .MuiSelect-icon": {
                "&.Mui-disabled": {
                  "& path": {
                    fill: COLORS.santasGrey,
                  },
                },
              },
            }}
            control={control}
            name="marketType"
            label={t(
              "createMarket.forms.marketDescription.block.marketType.placeholder",
            )}
            options={mockedMarketTypesOptions}
            optionSX={DropdownOption}
            disabled={disableFields}
          />
        </InputLabel>

        <InputLabel
          label={t(
            "createMarket.forms.marketDescription.block.accessControl.title",
          )}
        >
          <ExtendedSelect
            selectSX={{
              "& .MuiSelect-icon": {
                "&.Mui-disabled": {
                  "& path": {
                    fill: COLORS.santasGrey,
                  },
                },
              },
            }}
            control={control}
            name="accessControl"
            label={t(
              "createMarket.forms.marketDescription.block.accessControl.placeholder",
            )}
            options={mockedAccessControlOptions}
            optionSX={DropdownOption}
            disabled={disableFields}
          />
        </InputLabel>
      </Box>

      {isFixedTerm && (
        <>
          <Divider sx={{ margin: "28px 0" }} />

          <Typography variant="text3">Expiration Date</Typography>
          <Box
            sx={{
              ...SectionGrid,
              alignItems: "center",
              gap: "20px",
              marginTop: "8px",
            }}
          >
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DesktopDatePicker
                label="e.g. 12/12/25"
                format="DD/MM/YYYY"
                value={
                  fixedTermEndTimeWatch
                    ? dayjs.unix(fixedTermEndTimeWatch)
                    : null
                }
                onChange={(v) => {
                  setValue(
                    "fixedTermEndTime",
                    (v ? v.unix() : undefined) as number,
                  )
                }}
                minDate={tomorrow}
                maxDate={oneYearFromNow}
                slotProps={{
                  textField: {
                    sx: {
                      minWidth: "342px",

                      "&.MuiFormControl-root.MuiTextField-root": {
                        border: `1px solid ${COLORS.whiteLilac}`,
                        borderRadius: "12px",
                      },

                      "& .MuiInputBase-root.MuiFilledInput-root": {
                        fontFamily: "inherit",
                        fontSize: 14,
                        fontWeight: 500,
                        lineHeight: "20px",
                        backgroundColor: "transparent",

                        "&:before, &:after": {
                          display: "none",
                        },
                      },

                      "& .MuiInputBase-input.MuiFilledInput-input": {
                        height: "20px",
                        padding: "16px",
                      },
                    },
                  },
                }}
              />
            </LocalizationProvider>

            <HorizontalInputLabel
              label="Early Close"
              explainer="Allows you to close the market before it reaches maturity"
            >
              <Switch
                checked={allowClosureBeforeTermWatch}
                onChange={(e) => {
                  setValue("allowClosureBeforeTerm", e.target.checked)
                }}
              />
            </HorizontalInputLabel>

            <Box sx={{ width: "100%", gridArea: "2/2/-2/-2" }}>
              <HorizontalInputLabel
                label="Reduce Expiration"
                explainer="Allows you to reduce the market's maturity date"
              >
                <Switch
                  checked={allowTermReductionWatch}
                  onChange={(e) => {
                    setValue("allowTermReduction", e.target.checked)
                  }}
                />
              </HorizontalInputLabel>
            </Box>
          </Box>
        </>
      )}

      <FormFooter
        backOnClick={handleBackClick}
        nextOnClick={handleNextClick}
        disableNext={!isFormValid}
      />
    </Box>
  )
}
