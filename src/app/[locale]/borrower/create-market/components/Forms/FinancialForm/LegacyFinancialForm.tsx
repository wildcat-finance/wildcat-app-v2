import { Box, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import {
  BaseAprField,
  CapacityField,
  GracePeriodField,
  GraceVsWithdrawalWarning,
  MinimumDepositField,
  PenaltyAprField,
  ReserveRatioField,
  WithdrawalCycleField,
} from "./fields"
import { FinancialFormProps } from "./interface"
import { useFinancialFormState } from "./useFinancialFormState"
import { FormFooter } from "../../FormFooter"
import { FormContainer, SectionGrid } from "../style"

export const LegacyFinancialForm = ({
  form,
  tokenAsset,
}: FinancialFormProps) => {
  const { t } = useTranslation()
  const {
    handleBackClick,
    handleNextClick,
    isFormValid,
    showGraceVsWithdrawalWarning,
  } = useFinancialFormState(form)

  return (
    <Box sx={FormContainer}>
      <Typography variant="title2" sx={{ marginBottom: "36px" }}>
        {t("createNewMarket.financial.title")}
      </Typography>

      <Box
        sx={{
          ...SectionGrid,
          gap: "38px 10px",
        }}
      >
        <CapacityField form={form} tokenAsset={tokenAsset} />
        <BaseAprField
          form={form}
          label={t("createNewMarket.financial.baseAPR.label")}
        />
        <PenaltyAprField form={form} />
        <ReserveRatioField form={form} />
        <GracePeriodField form={form} />
        <WithdrawalCycleField form={form} />
        <GraceVsWithdrawalWarning show={showGraceVsWithdrawalWarning} />
      </Box>

      <MinimumDepositField form={form} tokenAsset={tokenAsset} />

      <FormFooter
        backOnClick={handleBackClick}
        nextOnClick={handleNextClick}
        disableNext={!isFormValid}
      />
    </Box>
  )
}
