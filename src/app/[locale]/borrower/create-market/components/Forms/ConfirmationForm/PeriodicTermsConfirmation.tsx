import { Box, Divider, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { dayjs } from "@/utils/dayjs"

import { ConfirmationFormProps } from "./interface"
import { DividerStyle, SubtitleStyle } from "./style"
import { formatDurationFromSeconds } from "../../../utils/units"
import { ConfirmationFormItem } from "../../ConfirmationFormItem"
import { SectionGrid } from "../style"

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
          value={formatDurationFromSeconds(Number(getValues("periodDuration")))}
        />

        <ConfirmationFormItem
          label={t("common.fields.withdrawalWindow")}
          value={formatDurationFromSeconds(
            Number(getValues("withdrawalWindowDuration")),
          )}
        />
      </Box>

      <Divider sx={DividerStyle} />
    </>
  )
}
