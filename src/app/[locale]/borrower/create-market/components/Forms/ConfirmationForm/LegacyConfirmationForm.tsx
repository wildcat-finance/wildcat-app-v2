import { Box, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { formatNumberWithCommas } from "@/utils/formatters"

import { ConfirmationFormProps } from "./interface"
import {
  ConfirmationFinancialSectionProps,
  SharedConfirmationForm,
} from "./shared"
import { SubtitleStyle } from "./style"
import { formatDurationFromHoursInput } from "../../../utils/units"
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
          value={`${formatNumberWithCommas(
            getValues("maxTotalSupply"),
          )} ${tokenAsset?.symbol}`}
        />

        <ConfirmationFormItem
          label={t("common.fields.baseApr")}
          value={`${formatNumberWithCommas(
            getValues("annualInterestBips"),
            2,
          )}%`}
        />

        <ConfirmationFormItem
          label={t("common.fields.protocolFeeApr")}
          /* dev: hardcoded for now, need to grab protocol fee from template */
          value={`${formatNumberWithCommas(
            (getValues("annualInterestBips") * 5) / 100,
            4,
          )}%`}
        />

        <ConfirmationFormItem
          label={t("common.fields.penaltyApr")}
          value={`${formatNumberWithCommas(
            getValues("delinquencyFeeBips"),
            2,
          )}%`}
        />

        <ConfirmationFormItem
          label={t("common.fields.reserveRatio")}
          value={`${formatNumberWithCommas(getValues("reserveRatioBips"), 2)}%`}
        />

        <ConfirmationFormItem
          label={t("borrower.createMarket.periods.grace.label")}
          value={formatDurationFromHoursInput(
            getValues("delinquencyGracePeriod"),
          )}
        />
        <ConfirmationFormItem
          label={t("common.fields.withdrawalCycleDuration")}
          value={formatDurationFromHoursInput(
            getValues("withdrawalBatchDuration"),
          )}
        />

        <ConfirmationFormItem
          label={t("common.fields.minimumDeposit")}
          value={`${formatNumberWithCommas(
            getValues("minimumDeposit"),
          )} ${tokenAsset?.symbol}`}
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
