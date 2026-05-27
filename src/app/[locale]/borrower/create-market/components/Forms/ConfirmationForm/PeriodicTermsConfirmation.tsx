import { Box, Divider, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { dayjs } from "@/utils/dayjs"

import { ConfirmationFormProps } from "./interface"
import { DividerStyle, SubtitleStyle } from "./style"
import { ConfirmationFormItem } from "../../ConfirmationFormItem"
import { SectionGrid } from "../style"

const DAY_SECONDS = 86_400
const DURATION_DECIMAL_SCALE = 5

const formatDuration = (seconds: number, unitSeconds: number) =>
  `${Number((seconds / unitSeconds).toFixed(DURATION_DECIMAL_SCALE))}`

const formatUtcTimestamp = (timestamp: number) =>
  timestamp ? dayjs.unix(timestamp).utc().format("DD/MM/YYYY HH:mm [UTC]") : ""

export const PeriodicTermsConfirmation = ({
  form,
}: Pick<ConfirmationFormProps, "form">) => {
  const { t } = useTranslation()
  const { getValues } = form

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
            DAY_SECONDS,
          )} ${t(
            "createNewMarket.policy.periodic.periodDuration.chip",
          ).toLowerCase()}`}
        />

        <ConfirmationFormItem
          label={t(
            "createNewMarket.policy.periodic.withdrawalWindowDuration.label",
          )}
          value={`${formatDuration(
            Number(getValues("withdrawalWindowDuration")),
            DAY_SECONDS,
          )} ${t(
            "createNewMarket.policy.periodic.withdrawalWindowDuration.chip",
          ).toLowerCase()}`}
        />
      </Box>

      <Divider sx={DividerStyle} />
    </>
  )
}
