import { Box, Divider, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { timestampToDateFormatted } from "@/utils/formatters"

import { ConfirmationFormProps } from "./interface"
import { DividerStyle, SubtitleStyle } from "./style"
import { ConfirmationFormItem } from "../../ConfirmationFormItem"
import { SectionGrid } from "../style"

const DAY_SECONDS = 86_400
const DURATION_DECIMAL_SCALE = 5

const formatDuration = (seconds: number, unitSeconds: number) =>
  `${Number((seconds / unitSeconds).toFixed(DURATION_DECIMAL_SCALE))}`

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
          value={
            timestampToDateFormatted(
              Number(getValues("firstWithdrawalWindowStart")),
              "DD/MM/YYYY",
            ) ?? ""
          }
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
