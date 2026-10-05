import {
  Box,
  Divider,
  FormControlLabel,
  Switch,
  Typography,
} from "@mui/material"
import { DesktopDateTimePicker } from "@mui/x-date-pickers"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { useTranslation } from "react-i18next"

import { InputLabel } from "@/components/InputLabel"
import { NumberTextField } from "@/components/NumberTextfield"
import { dayjs } from "@/utils/dayjs"

import { FinancialFormProps } from "./interface"
import {
  getRepaymentTermIssues,
  supportsRepaymentSchedule,
} from "../../../validation/repaymentTerms"
import { SectionGrid } from "../style"

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
          <Typography variant="text3" component="p" sx={{ my: "16px" }}>
            {t("borrower.createMarket.repayment.explanation")}
          </Typography>
          {!supported && (
            <Typography role="alert" color="error">
              {t("borrower.createMarket.repayment.unsupported")}
            </Typography>
          )}
          <Box
            sx={{
              ...SectionGrid,
              gridTemplateRows: "auto",
              gridTemplateColumns: {
                xs: "minmax(0, 1fr)",
                sm: "repeat(2, minmax(0, 1fr))",
              },
              gap: "20px",
              mt: "16px",
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
                  value={repaymentDate ? dayjs.unix(repaymentDate).utc() : null}
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
                    textField: {
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
                label={t("common.units.hours")}
                value={
                  repaymentPeriod === undefined ? "" : repaymentPeriod / 3600
                }
                decimalScale={2}
                endAdornment={
                  <Typography variant="text3">
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
          {repaymentDate !== undefined &&
            repaymentPeriod !== undefined &&
            issues.length === 0 && (
              <Typography variant="text3" component="p" sx={{ mt: "16px" }}>
                {t("borrower.createMarket.repayment.deadline", {
                  deadline: dayjs
                    .unix(repaymentDate + repaymentPeriod)
                    .utc()
                    .format("DD/MM/YYYY HH:mm:ss [UTC]"),
                })}
              </Typography>
            )}
          <Typography variant="text3" component="p" sx={{ mt: "12px" }}>
            {t("borrower.createMarket.repayment.zeroPeriod")}
          </Typography>
        </>
      )}
    </>
  )
}
