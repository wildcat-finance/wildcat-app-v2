import { Box, Divider, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { dayjs } from "@/utils/dayjs"
import { formatNumberWithCommas } from "@/utils/formatters"

import { ConfirmationFormProps } from "./interface"
import { DividerStyle, SubtitleStyle } from "./style"
import { PERIODIC_DURATION_UNIT_SECONDS } from "../../../utils/units"
import { ConfirmationFormItem } from "../../ConfirmationFormItem"
import { SectionGrid } from "../style"

const DURATION_DECIMAL_SCALE = 2

const formatDuration = (seconds: number, unitSeconds: number) =>
  formatNumberWithCommas(seconds / unitSeconds, DURATION_DECIMAL_SCALE)

const formatUtcTimestamp = (timestamp: number) =>
  timestamp ? dayjs.unix(timestamp).utc().format("DD/MM/YYYY HH:mm [UTC]") : ""

export const PeriodicTermsConfirmation = ({
  form,
}: Pick<ConfirmationFormProps, "form">) => {
  const { t } = useTranslation()
  const { getValues } = form
  const unit = getValues("periodicDurationUnit") ?? "Days"
  const unitSeconds = PERIODIC_DURATION_UNIT_SECONDS[unit]

  return (
    <>
      <Typography variant="text4" sx={SubtitleStyle}>
        {t("common.fields.marketTerm")}
      </Typography>

      <Box
        sx={{
          ...SectionGrid,
          gap: "20px 12px",
        }}
      >
        <ConfirmationFormItem
          label={t(
            "borrower.createMarket.policy.periodic.firstWindowStart.label",
          )}
          value={formatUtcTimestamp(
            Number(getValues("firstWithdrawalWindowStart")),
          )}
        />

        <ConfirmationFormItem
          label={t("common.fields.withdrawalPeriod")}
          value={`${formatDuration(
            Number(getValues("periodDuration")),
            unitSeconds,
          )} ${unit.toLowerCase()}`}
        />

        <ConfirmationFormItem
          label={t("common.fields.withdrawalWindow")}
          value={`${formatDuration(
            Number(getValues("withdrawalWindowDuration")),
            unitSeconds,
          )} ${unit.toLowerCase()}`}
        />
      </Box>

      <Divider sx={DividerStyle} />
    </>
  )
}
