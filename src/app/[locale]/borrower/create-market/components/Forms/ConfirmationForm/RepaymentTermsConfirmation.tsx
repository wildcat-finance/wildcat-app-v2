import { Box, Divider, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { dayjs } from "@/utils/dayjs"

import { ConfirmationFormProps } from "./interface"
import { DividerStyle, SubtitleStyle } from "./style"
import { ConfirmationFormItem } from "../../ConfirmationFormItem"
import { SectionGrid } from "../style"

export const RepaymentTermsConfirmation = ({
  form,
}: Pick<ConfirmationFormProps, "form">) => {
  const { t } = useTranslation()
  if (!form.getValues("scheduleRepayment")) return null
  const date = Number(form.getValues("repaymentDate"))
  const period = Number(form.getValues("repaymentPeriod"))
  const formatDate = (timestamp: number) =>
    dayjs.unix(timestamp).utc().format("DD/MM/YYYY HH:mm:ss [UTC]")

  return (
    <>
      <Divider sx={DividerStyle} />
      <Typography variant="text4" sx={SubtitleStyle}>
        {t("marketDetails.repayment.title")}
      </Typography>
      <Box
        sx={{
          ...SectionGrid,
          gridTemplateRows: "auto",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            sm: "repeat(2, minmax(0, 1fr))",
          },
          gap: "20px 12px",
        }}
      >
        <ConfirmationFormItem
          label={t("marketDetails.repayment.date")}
          value={formatDate(date)}
        />
        <ConfirmationFormItem
          label={t("marketDetails.repayment.period")}
          value={t("marketDetails.repayment.hours", { count: period / 3600 })}
        />
        <ConfirmationFormItem
          label={t("marketDetails.repayment.deadline")}
          value={formatDate(date + period)}
        />
      </Box>
      <Typography variant="text3" component="p" sx={{ mt: "16px" }}>
        {t("borrower.createMarket.repayment.explanation")}
      </Typography>
    </>
  )
}
