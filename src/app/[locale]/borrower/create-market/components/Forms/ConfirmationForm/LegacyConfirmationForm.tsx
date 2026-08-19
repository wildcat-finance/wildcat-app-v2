import { Box, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { formatNumberWithCommas } from "@/utils/formatters"

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
        {t("createNewMarket.financial.title")}
      </Typography>

      <Box
        sx={{
          ...SectionGrid,
          gap: "20px 12px",
          gridTemplateRows: "repeat(3, 1fr)",
        }}
      >
        <ConfirmationFormItem
          label={t("createNewMarket.financial.maxCapacity.label")}
          value={`${formatNumberWithCommas(
            getValues("maxTotalSupply"),
          )} ${tokenAsset?.symbol}`}
        />

        <ConfirmationFormItem
          label={t("createNewMarket.financial.baseAPR.label")}
          value={`${formatNumberWithCommas(
            getValues("annualInterestBips"),
            2,
          )}%`}
        />

        <ConfirmationFormItem
          label={t("createNewMarket.financial.protocolFee.label")}
          /* dev: hardcoded for now, need to grab protocol fee from template */
          value={`${formatNumberWithCommas(
            (getValues("annualInterestBips") * 5) / 100,
            4,
          )}%`}
        />

        <ConfirmationFormItem
          label={t("createNewMarket.financial.penaltyAPR.label")}
          value={`${formatNumberWithCommas(
            getValues("delinquencyFeeBips"),
            2,
          )}%`}
        />

        <ConfirmationFormItem
          label={t("createNewMarket.financial.ratio.label")}
          value={`${formatNumberWithCommas(getValues("reserveRatioBips"), 2)}%`}
        />

        <ConfirmationFormItem
          label={t("createNewMarket.periods.grace.label")}
          value={`${formatNumberWithCommas(
            getValues("delinquencyGracePeriod"),
            2,
          )} hours`}
        />
        <ConfirmationFormItem
          label={t("createNewMarket.periods.wdCycle.label")}
          value={`${formatNumberWithCommas(
            getValues("withdrawalBatchDuration"),
            2,
          )} hours`}
        />

        <ConfirmationFormItem
          label={t("createNewMarket.financial.minDeposit.label")}
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
