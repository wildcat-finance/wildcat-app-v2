import { useEffect } from "react"

import {
  Box,
  Divider,
  SvgIcon,
  Switch,
  TextField,
  Typography,
  useTheme,
} from "@mui/material"
import { DesktopDatePicker } from "@mui/x-date-pickers"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"

import { FormFooter } from "@/app/[locale]/borrower/create-market/components/FormFooter"
import {
  FormContainer,
  SectionGrid,
} from "@/app/[locale]/borrower/create-market/components/Forms/style"
import ArrowLeftIcon from "@/assets/icons/sharpArrow_icon.svg"
import { ExtendedSelect } from "@/components/@extended/ExtendedSelect"
import { HorizontalInputLabel } from "@/components/HorisontalInputLabel"
import { InputLabel } from "@/components/InputLabel"
import { getMaxFixedTermDays } from "@/config/market-duration"
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
import { lh, pxToRem } from "@/theme/units"
import { dayjs } from "@/utils/dayjs"

import { MarketPolicyFormProps } from "./interface"

const DateCalendarArrowLeft = () => (
  <SvgIcon
    sx={{
      "& path": { fill: `${COLORS.greySuit}` },
    }}
  >
    <ArrowLeftIcon />
  </SvgIcon>
)

const DateCalendarArrowRight = () => (
  <SvgIcon
    sx={{
      "& path": { fill: `${COLORS.greySuit}` },
    }}
    style={{ rotate: "180deg" }}
  >
    <ArrowLeftIcon />
  </SvgIcon>
)

export const MarketPolicyForm = ({
  form,
  policyOptions,
  isTestnet,
}: MarketPolicyFormProps) => {
  const { t } = useTranslation()
  const theme = useTheme()
  const dispatch = useAppDispatch()
  const router = useRouter()

  const today = dayjs.unix(Date.now() / 1_000).startOf("day")
  const tomorrow = today.add(1, "day")
  const maxDays = getMaxFixedTermDays(isTestnet)
  const maxDate = today.add(maxDays, "days")

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
    accessControlWatch.trim() !== "" &&
    !errors.fixedTermEndTime

  const isFixedFormValid =
    !!policyWatch &&
    policyWatch.trim() !== "" &&
    !!policyNameWatch &&
    policyNameWatch.trim() !== "" &&
    !!marketTypeWatch &&
    marketTypeWatch.trim() !== "" &&
    !!accessControlWatch &&
    accessControlWatch.trim() !== "" &&
    !!fixedTermEndTimeWatch &&
    !errors.fixedTermEndTime

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
        CreateMarketSteps.CONFIRM,
        CreateMarketSteps.LRESTRICTIONS,
        CreateMarketSteps.FINANCIAL,
        CreateMarketSteps.MLA,
      ]

      dispatch(setIsDisabled({ steps: allStepsToDisable, disabled: true }))
    }
  }, [isFormValid, isFixedTerm])

  return (
    <Box sx={FormContainer}>
      <Typography variant="title2" sx={{ marginBottom: "36px" }}>
        {t("createNewMarket.policy.title")}
      </Typography>

      <Box
        sx={{
          ...SectionGrid,
          gap: "38px 10px",
        }}
      >
        <InputLabel label={t("createNewMarket.policy.policy.label")}>
          <ExtendedSelect
            control={control}
            name="policy"
            label={t("createNewMarket.policy.policy.placeholder")}
            options={policyOptions}
            optionSX={{ width: "360px" }}
          />
        </InputLabel>

        <InputLabel label={t("createNewMarket.policy.name.label")}>
          <TextField
            placeholder={t("createNewMarket.policy.name.placeholder")}
            error={Boolean(errors.policyName)}
            helperText={errors.policyName?.message}
            {...register("policyName")}
            disabled={disableFields}
          />
        </InputLabel>

        <InputLabel label={t("createNewMarket.policy.type.label")}>
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
            label={t("createNewMarket.policy.type.placeholder")}
            options={mockedMarketTypesOptions}
            optionSX={{ width: "360px" }}
            disabled={disableFields}
          />
        </InputLabel>

        <InputLabel label={t("createNewMarket.policy.access.label")}>
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
            label={t("createNewMarket.policy.access.placeholder")}
            options={mockedAccessControlOptions}
            optionSX={{ width: "360px" }}
            disabled={disableFields}
          />
        </InputLabel>
      </Box>

      {isFixedTerm && (
        <>
          <Divider sx={{ margin: "28px 0" }} />

          <Typography variant="text3">
            {t("createNewMarket.policy.expiration.label")}
          </Typography>
          <Box
            sx={{
              ...SectionGrid,
              alignItems: "center",
              gap: "20px",
              marginTop: "8px",
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DesktopDatePicker
                  label="e.g. 25/12/2024"
                  format="DD/MM/YYYY"
                  value={
                    fixedTermEndTimeWatch
                      ? dayjs.unix(fixedTermEndTimeWatch)
                      : null
                  }
                  onChange={(v) => {
                    if (v && v.isValid()) {
                      setValue("fixedTermEndTime", v.unix(), {
                        shouldTouch: true,
                        shouldValidate: true,
                      })
                    } else if (!v) {
                      setValue(
                        "fixedTermEndTime",
                        undefined as unknown as number,
                        {
                          shouldTouch: true,
                        },
                      )
                    }
                  }}
                  minDate={tomorrow}
                  maxDate={maxDate}
                  slots={{
                    leftArrowIcon: DateCalendarArrowLeft,
                    rightArrowIcon: DateCalendarArrowRight,
                    textField: TextField,
                  }}
                  slotProps={{
                    layout: {
                      sx: {
                        "& .MuiYearCalendar-root": {
                          padding: "12px",
                        },
                      },
                    },
                    popper: {
                      sx: {
                        "& .MuiYearCalendar-root": {
                          padding: "12px",
                        },
                        "& .MuiPaper-root": {
                          padding: "10px",
                        },
                      },
                    },
                    textField: {
                      sx: {
                        minWidth: "342px",
                        "&.MuiFormControl-root.MuiTextField-root": {
                          border: `1px solid ${COLORS.whiteLilac}`,
                          borderRadius: "12px",
                        },

                        "& .MuiInputBase-root.MuiFilledInput-root": {
                          fontFamily: "inherit",
                          fontSize: pxToRem(14),
                          lineHeight: lh(20, 14),
                          fontWeight: 500,
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
                      helperText: errors.fixedTermEndTime?.message,
                      error: Boolean(errors.fixedTermEndTime),
                      FormHelperTextProps: {
                        sx: {
                          color: "wildWatermelon",
                          fontSize: pxToRem(11),
                          lineHeight: lh(16, 11),
                          letterSpacing: "normal",
                        },
                      },
                    },
                  }}
                  disablePast
                />
              </LocalizationProvider>
            </Box>

            <HorizontalInputLabel
              label={t("createNewMarket.policy.earlyClose.label")}
              explainer={t("createNewMarket.policy.earlyClose.explainer")}
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
                label={t("createNewMarket.policy.reduceExpiration.label")}
                explainer={t(
                  "createNewMarket.policy.reduceExpiration.explainer",
                )}
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
