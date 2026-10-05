import {
  Box,
  Divider,
  FormControlLabel,
  styled,
  SvgIcon,
  Switch,
  TextField,
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
import { dayjs } from "@/utils/dayjs"

import { FinancialFormProps } from "./interface"
import { repaymentField, repaymentPickerLayout } from "./style"
import {
  getRepaymentTermIssues,
  supportsRepaymentSchedule,
} from "../../../validation/repaymentTerms"

// Filter the picker's ownerState so TextField can apply its own theme variants.
const RepaymentDateTextField = styled(TextField)(repaymentField)

const DateCalendarArrowLeft = () => (
  <SvgIcon sx={{ "& path": { fill: COLORS.greySuit } }}>
    <ArrowLeftIcon />
  </SvgIcon>
)

const DateCalendarArrowRight = () => (
  <SvgIcon sx={{ rotate: "180deg", "& path": { fill: COLORS.greySuit } }}>
    <ArrowLeftIcon />
  </SvgIcon>
)

export const RepaymentTermsSection = ({
  form,
  repaymentChainId,
  repaymentConstraints,
}: Omit<FinancialFormProps, "tokenAsset">) => {
  const { t } = useTranslation()
  const values = form.watch()
  const { scheduleRepayment, repaymentDate, repaymentPeriod } = values
  const supported =
    repaymentChainId !== undefined &&
    supportsRepaymentSchedule(repaymentChainId, values.implementationType)
  const issues = getRepaymentTermIssues(values, repaymentConstraints)
  const dateError = issues.find((issue) => issue.path === "repaymentDate")
  const periodError = issues.find((issue) => issue.path === "repaymentPeriod")

  if (!supported && !scheduleRepayment) return null

  return (
    <>
      <Divider sx={{ my: "28px" }} />
      <Box sx={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <FormControlLabel
          control={
            <Switch
              checked={!!scheduleRepayment}
              onChange={(_, checked) => {
                form.setValue("scheduleRepayment", checked, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }}
            />
          }
          label={t("borrower.createMarket.repayment.enable")}
        />
        {scheduleRepayment && (
          <>
            <Typography
              variant="text3"
              component="p"
              color={COLORS.blackRock07}
            >
              {t("borrower.createMarket.repayment.explanation")}
            </Typography>
            {!supported && (
              <Typography role="alert" color="error">
                {t("borrower.createMarket.repayment.unsupported")}
              </Typography>
            )}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
                alignItems: "start",
                gap: "20px 12px",
              }}
            >
              <InputLabel label={t("borrower.createMarket.repayment.dateUtc")}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DesktopDateTimePicker
                    label={t("borrower.createMarket.repayment.dateUtc")}
                    timezone="UTC"
                    ampm={false}
                    format="DD/MM/YYYY HH:mm"
                    timeSteps={{ minutes: 1 }}
                    slots={{
                      textField: RepaymentDateTextField,
                      leftArrowIcon: DateCalendarArrowLeft,
                      rightArrowIcon: DateCalendarArrowRight,
                    }}
                    value={
                      repaymentDate ? dayjs.unix(repaymentDate).utc() : null
                    }
                    onChange={(value) => {
                      form.setValue(
                        "repaymentDate",
                        value?.isValid()
                          ? value.startOf("minute").unix()
                          : undefined,
                        { shouldDirty: true, shouldValidate: true },
                      )
                    }}
                    slotProps={{
                      layout: { sx: repaymentPickerLayout },
                      popper: {
                        modifiers: [
                          {
                            name: "preventOverflow",
                            options: {
                              altAxis: true,
                              padding: 8,
                              tether: false,
                            },
                          },
                        ],
                      },
                      desktopPaper: {
                        sx: {
                          padding: "12px",
                          borderRadius: "12px",
                          border: `1px solid ${COLORS.whiteLilac}`,
                          maxHeight: "calc(100dvh - 16px)",
                          overflowY: "auto",
                        },
                      },
                      textField: {
                        variant: "filled",
                        size: "regular",
                        fullWidth: true,
                        error: !!dateError,
                        helperText: dateError?.message,
                      },
                    }}
                  />
                </LocalizationProvider>
              </InputLabel>
              <InputLabel label={t("marketDetails.repayment.period")}>
                <NumberTextField
                  sx={repaymentField}
                  label={t("common.units.hours")}
                  value={
                    repaymentPeriod === undefined ? "" : repaymentPeriod / 3600
                  }
                  decimalScale={2}
                  endAdornment={
                    <Typography variant="text2" color={COLORS.santasGrey}>
                      {t("common.units.hours")}
                    </Typography>
                  }
                  error={!!periodError}
                  helperText={periodError?.message}
                  onValueChange={({ floatValue }) => {
                    form.setValue(
                      "repaymentPeriod",
                      floatValue === undefined
                        ? undefined
                        : Math.round(floatValue * 3600),
                      { shouldDirty: true, shouldValidate: true },
                    )
                  }}
                />
              </InputLabel>
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                padding: "16px",
                borderRadius: "12px",
                backgroundColor: COLORS.hintOfRed,
              }}
            >
              {repaymentDate !== undefined &&
                repaymentPeriod !== undefined &&
                issues.length === 0 && (
                  <Typography variant="text3" component="p" fontWeight={600}>
                    {t("borrower.createMarket.repayment.deadline", {
                      deadline: dayjs
                        .unix(repaymentDate + repaymentPeriod)
                        .utc()
                        .format("DD/MM/YYYY HH:mm:ss [UTC]"),
                    })}
                  </Typography>
                )}
              <Typography
                variant="text3"
                component="p"
                color={COLORS.blackRock07}
              >
                {t("borrower.createMarket.repayment.zeroPeriod")}
              </Typography>
            </Box>
          </>
        )}
      </Box>
    </>
  )
}
