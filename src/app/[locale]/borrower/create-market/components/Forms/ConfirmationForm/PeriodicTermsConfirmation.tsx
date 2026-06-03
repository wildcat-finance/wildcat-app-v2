import { Box, Divider, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { dayjs } from "@/utils/dayjs"

import { ConfirmationFormProps } from "./interface"
import { DividerStyle, SubtitleStyle } from "./style"
import { ConfirmationFormItem } from "../../ConfirmationFormItem"
import { SectionGrid } from "../style"

const DAY_SECONDS = 86_400
const HOUR_SECONDS = 3_600
const DURATION_DECIMAL_SCALE = 2

const formatDuration = (seconds: number, unitSeconds: number) =>
  `${Number((seconds / unitSeconds).toFixed(DURATION_DECIMAL_SCALE))}`

const formatUtcTimestamp = (timestamp: number) =>
  timestamp ? dayjs.unix(timestamp).utc().format("DD/MM/YYYY HH:mm [UTC]") : ""

export const PeriodicTermsConfirmation = ({
  form,
}: Pick<ConfirmationFormProps, "form">) => {
  const { t } = useTranslation()
  const { getValues } = form
  const unit = getValues("periodicDurationUnit") ?? "Days"
  const unitSeconds = unit === "Days" ? DAY_SECONDS : HOUR_SECONDS

  return (
    <>
      <Typography variant="text4" sx={SubtitleStyle}>
        {t("createNewMarket.confirm.typeTerms")}
      </Typography>

      <Box
        sx={{
          ...SectionGrid,
          gap: "20px 12px",
        }}
      >
        <ConfirmationFormItem
          label={t("createNewMarket.policy.periodic.firstWindowStart.label")}
          value={formatUtcTimestamp(
            Number(getValues("firstWithdrawalWindowStart")),
          )}
        />

        <ConfirmationFormItem
          label={t("createNewMarket.policy.periodic.periodDuration.label")}
          value={`${formatDuration(
            Number(getValues("periodDuration")),
            unitSeconds,
          )} ${unit.toLowerCase()}`}
        />

        <ConfirmationFormItem
          label={t(
            "createNewMarket.policy.periodic.withdrawalWindowDuration.label",
          )}
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
