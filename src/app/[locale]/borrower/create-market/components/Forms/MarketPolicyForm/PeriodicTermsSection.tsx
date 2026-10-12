import {
  Box,
  Divider,
  SvgIcon,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material"
import { DesktopDateTimePicker } from "@mui/x-date-pickers"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { useTranslation } from "react-i18next"

import ArrowLeftIcon from "@/assets/icons/sharpArrow_icon.svg"
import { InputLabel } from "@/components/InputLabel"
import { NumberTextField } from "@/components/NumberTextfield"
import { COLORS } from "@/theme/colors"
import { lh, pxToRem } from "@/theme/units"
import { dayjs } from "@/utils/dayjs"

import { MarketPolicyFormProps } from "./interface"
import { WithdrawalSchedulePreview } from "./WithdrawalSchedulePreview"
import {
  PERIODIC_DURATION_UNIT_SECONDS,
  PERIODIC_DURATION_UNITS,
} from "../../../utils/units"

const DURATION_DECIMAL_SCALE = 2
const durationUnitLabels = {
  Days: "common.units.days",
  Hours: "common.units.hours",
  Minutes: "common.units.minutes",
} as const

const durationInputToSeconds = (
  value: number | undefined,
  unitSeconds: number,
) => (value === undefined ? undefined : Math.round(value * unitSeconds))

const secondsToDurationInput = (
  seconds: number | undefined,
  unitSeconds: number,
) =>
  seconds === undefined
    ? ""
    : Number((seconds / unitSeconds).toFixed(DURATION_DECIMAL_SCALE))

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

export const PeriodicTermsSection = ({
  form,
}: Pick<MarketPolicyFormProps, "form">) => {
  const { t } = useTranslation()

  const {
    setValue,
    formState: { errors },
    watch,
  } = form

  const firstWithdrawalWindowStartWatch = watch("firstWithdrawalWindowStart")
  const periodDurationWatch = watch("periodDuration")
  const withdrawalWindowDurationWatch = watch("withdrawalWindowDuration")
  const durationUnit = watch("periodicDurationUnit") ?? "Days"
  const unitSeconds = PERIODIC_DURATION_UNIT_SECONDS[durationUnit]
  const hasScheduleErrors = Boolean(
    errors.firstWithdrawalWindowStart ||
      errors.periodDuration ||
      errors.withdrawalWindowDuration,
  )

  return (
    <Box sx={{ containerType: "inline-size", containerName: "schedule" }}>
      <Divider sx={{ margin: "28px 0" }} />

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <Typography variant="text1" component="div">
          {t("borrower.createMarket.policy.periodic.sectionTitle")}
        </Typography>

        <ToggleButtonGroup
          aria-label={t("borrower.createMarket.policy.periodic.durationUnits")}
          exclusive
          size="small"
          value={durationUnit}
          onChange={(_, next) => {
            if (next) {
              setValue("periodicDurationUnit", next, { shouldTouch: true })
            }
          }}
          sx={{
            "& .MuiToggleButton-root": {
              textTransform: "none",
              padding: "2px 12px",
              border: `1px solid ${COLORS.whiteLilac}`,
              color: COLORS.santasGrey,
              "&.Mui-selected": {
                backgroundColor: COLORS.blueRibbon01,
                color: COLORS.ultramarineBlue,
              },
            },
          }}
        >
          {PERIODIC_DURATION_UNITS.map((unit) => (
            <ToggleButton key={unit} value={unit}>
              {t(durationUnitLabels[unit])}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr",
          alignItems: "start",
          gap: "20px 16px",
          marginTop: "20px",
          "& > *": { minWidth: 0 },
          "@container schedule (min-width: 480px)": {
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            "& > :first-of-type": { gridColumn: "1 / -1" },
          },
          "@container schedule (min-width: 720px)": {
            gridTemplateColumns: "minmax(0, 1.4fr) repeat(2, minmax(0, 1fr))",
            "& > :first-of-type": { gridColumn: "auto" },
          },
        }}
      >
        <InputLabel
          label={t("borrower.createMarket.policy.periodic.firstOpening")}
          tooltipText={t(
            "marketParameters.periodicTerm.firstWindowStartTooltip",
          )}
        >
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DesktopDateTimePicker
              label={t(
                "borrower.createMarket.policy.periodic.firstWindowStart.placeholder",
              )}
              format="DD MMM YYYY, HH:mm"
              value={
                firstWithdrawalWindowStartWatch
                  ? dayjs.unix(firstWithdrawalWindowStartWatch).utc()
                  : null
              }
              onChange={(v) => {
                if (v && v.isValid()) {
                  setValue("firstWithdrawalWindowStart", v.unix(), {
                    shouldTouch: true,
                    shouldValidate: true,
                  })
                } else if (!v) {
                  setValue("firstWithdrawalWindowStart", undefined, {
                    shouldTouch: true,
                    shouldValidate: true,
                  })
                }
              }}
              timezone="UTC"
              ampm={false}
              timeSteps={{ minutes: 1 }}
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
                    width: "100%",
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
                  helperText: errors.firstWithdrawalWindowStart?.message,
                  error: Boolean(errors.firstWithdrawalWindowStart),
                  inputProps: {
                    "aria-label": t(
                      "borrower.createMarket.policy.periodic.firstOpening",
                    ),
                  },
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
            />
          </LocalizationProvider>
        </InputLabel>

        <InputLabel
          label={t("borrower.createMarket.policy.periodic.everyPeriod")}
          tooltipText={t(
            "borrower.createMarket.policy.periodic.periodDuration.glossary",
          )}
        >
          <NumberTextField
            sx={{ width: "100%" }}
            label={t("borrower.createMarket.policy.periodic.everyPeriod")}
            value={secondsToDurationInput(periodDurationWatch, unitSeconds)}
            error={Boolean(errors.periodDuration)}
            helperText={errors.periodDuration?.message}
            decimalScale={DURATION_DECIMAL_SCALE}
            endAdornment={
              <Typography variant="text2" sx={{ color: COLORS.santasGrey }}>
                {t(durationUnitLabels[durationUnit])}
              </Typography>
            }
            onValueChange={(values) => {
              setValue(
                "periodDuration",
                durationInputToSeconds(values.floatValue, unitSeconds),
                {
                  shouldTouch: true,
                  shouldValidate: true,
                },
              )
            }}
          />
        </InputLabel>

        <InputLabel
          label={t("borrower.createMarket.policy.periodic.requestWindow")}
          tooltipText={t(
            "borrower.createMarket.policy.periodic.withdrawalWindowDuration.glossary",
          )}
        >
          <NumberTextField
            sx={{ width: "100%" }}
            label={t("borrower.createMarket.policy.periodic.requestWindow")}
            value={secondsToDurationInput(
              withdrawalWindowDurationWatch,
              unitSeconds,
            )}
            error={Boolean(errors.withdrawalWindowDuration)}
            helperText={errors.withdrawalWindowDuration?.message}
            decimalScale={DURATION_DECIMAL_SCALE}
            endAdornment={
              <Typography variant="text2" sx={{ color: COLORS.santasGrey }}>
                {t(durationUnitLabels[durationUnit])}
              </Typography>
            }
            onValueChange={(values) => {
              setValue(
                "withdrawalWindowDuration",
                durationInputToSeconds(values.floatValue, unitSeconds),
                {
                  shouldTouch: true,
                  shouldValidate: true,
                },
              )
            }}
          />
        </InputLabel>
      </Box>
      <WithdrawalSchedulePreview
        firstWithdrawalWindowStart={firstWithdrawalWindowStartWatch}
        periodDuration={periodDurationWatch}
        withdrawalWindowDuration={withdrawalWindowDurationWatch}
        hasErrors={hasScheduleErrors}
      />
    </Box>
  )
}
