import { Box, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { ConfirmationFormProps } from "./interface"
import {
  ConfirmationFinancialSectionProps,
  SharedConfirmationForm,
} from "./shared"
import { SubtitleStyle } from "./style"
import { ConfirmationFormItem } from "../../ConfirmationFormItem"
import { SectionGrid } from "../style"

const LegacyFinancialSection = ({
  form,
  tokenAsset,
}: ConfirmationFinancialSectionProps) => {
  const { t } = useTranslation()
  const { getValues } = form

  return (
    <>
      <Typography variant="text4" sx={SubtitleStyle}>
        {t("borrower.createMarket.financial.title")}
      </Typography>

      <Box
        sx={{
          ...SectionGrid,
          gap: "20px 12px",
          gridTemplateRows: "repeat(3, 1fr)",
        }}
      >
        <ConfirmationFormItem
          label={t("borrower.createMarket.financial.maxCapacity.label")}
          value={`${getValues("maxTotalSupply")} ${tokenAsset?.symbol}`}
        />

        <ConfirmationFormItem
          label={t("common.fields.baseApr")}
          value={`${getValues("annualInterestBips")}%`}
        />

        <ConfirmationFormItem
          label={t("common.fields.protocolFeeApr")}
          /* dev: hardcoded for now, need to grab protocol fee from template */
          value={`${(getValues("annualInterestBips") * 5) / 100}%`}
        />

        <ConfirmationFormItem
          label={t("common.fields.penaltyApr")}
          value={`${getValues("delinquencyFeeBips")}%`}
        />

        <ConfirmationFormItem
          label={t("common.fields.reserveRatio")}
          value={`${getValues("reserveRatioBips")}%`}
        />

        <ConfirmationFormItem
          label={t("borrower.createMarket.periods.grace.label")}
          value={`${getValues("delinquencyGracePeriod")} hours`}
        />
        <ConfirmationFormItem
          label={t("common.fields.withdrawalCycleDuration")}
          value={`${getValues("withdrawalBatchDuration")} hours`}
        />

        <ConfirmationFormItem
          label={t("common.fields.minimumDeposit")}
          value={`${getValues("minimumDeposit") ?? 0} ${tokenAsset?.symbol}`}
        />
      </Box>
    </>
  )
}

export const LegacyConfirmationForm = (props: ConfirmationFormProps) => (
  <SharedConfirmationForm
    {...props}
    FinancialSection={LegacyFinancialSection}
  />
)
