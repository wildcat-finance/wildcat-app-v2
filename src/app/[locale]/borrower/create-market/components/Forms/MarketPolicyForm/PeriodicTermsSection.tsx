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
import { SectionGrid } from "../style"

const DAY_SECONDS = 86_400
const HOUR_SECONDS = 3_600
const DURATION_DECIMAL_SCALE = 2

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
  const unitSeconds = durationUnit === "Days" ? DAY_SECONDS : HOUR_SECONDS

  return (
    <>
      <Divider sx={{ margin: "28px 0" }} />

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="text3">
          {t("createNewMarket.policy.periodic.sectionTitle")}
        </Typography>

        <ToggleButtonGroup
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
                backgroundColor: COLORS.whiteSmoke,
                color: COLORS.blackRock,
              },
            },
          }}
        >
          <ToggleButton value="Days">Days</ToggleButton>
          <ToggleButton value="Hours">Hours</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <Box
        sx={{
          ...SectionGrid,
          alignItems: "center",
          gap: "20px",
          marginTop: "8px",
        }}
      >
        <InputLabel
          label={t("createNewMarket.policy.periodic.firstWindowStart.label")}
          tooltipText={t(
            "createNewMarket.policy.periodic.firstWindowStart.glossary",
          )}
        >
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DesktopDateTimePicker
              label={t(
                "createNewMarket.policy.periodic.firstWindowStart.placeholder",
              )}
              format="DD/MM/YYYY HH:mm"
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
                  helperText: errors.firstWithdrawalWindowStart?.message,
                  error: Boolean(errors.firstWithdrawalWindowStart),
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
          label={t("createNewMarket.policy.periodic.periodDuration.label")}
          tooltipText={t(
            "createNewMarket.policy.periodic.periodDuration.glossary",
          )}
        >
          <NumberTextField
            label={t(
              "createNewMarket.policy.periodic.periodDuration.placeholder",
            )}
            value={secondsToDurationInput(periodDurationWatch, unitSeconds)}
            error={Boolean(errors.periodDuration)}
            helperText={errors.periodDuration?.message}
            decimalScale={DURATION_DECIMAL_SCALE}
            endAdornment={
              <Typography variant="text2" sx={{ color: COLORS.santasGrey }}>
                {durationUnit}
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
          label={t(
            "createNewMarket.policy.periodic.withdrawalWindowDuration.label",
          )}
          tooltipText={t(
            "createNewMarket.policy.periodic.withdrawalWindowDuration.glossary",
          )}
        >
          <NumberTextField
            label={t(
              "createNewMarket.policy.periodic.withdrawalWindowDuration.placeholder",
            )}
            value={secondsToDurationInput(
              withdrawalWindowDurationWatch,
              unitSeconds,
            )}
            error={Boolean(errors.withdrawalWindowDuration)}
            helperText={errors.withdrawalWindowDuration?.message}
            decimalScale={DURATION_DECIMAL_SCALE}
            endAdornment={
              <Typography variant="text2" sx={{ color: COLORS.santasGrey }}>
                {durationUnit}
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
    </>
  )
}
