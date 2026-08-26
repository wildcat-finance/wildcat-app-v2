import { Box } from "@mui/material"
import { useTranslation } from "react-i18next"

import {
  BaseAprField,
  CapacityField,
  CommitmentFeeField,
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

export const RevolvingFinancialForm = ({
  form,
  tokenAsset,
}: FinancialFormProps) => {
  const { t } = useTranslation()
  const commitmentFeePercent = form.watch("commitmentFeePercent")
  const hasCommitmentFeeValue =
    commitmentFeePercent !== undefined && !Number.isNaN(commitmentFeePercent)
  const {
    handleBackClick,
    handleNextClick,
    isFormValid,
    showGraceVsWithdrawalWarning,
  } = useFinancialFormState(form, [
    hasCommitmentFeeValue && !form.formState.errors.commitmentFeePercent,
  ])

  return (
    <Box sx={FormContainer}>
      <Box
        sx={{
          ...SectionGrid,
          gap: "38px 10px",
        }}
      >
        <CapacityField form={form} tokenAsset={tokenAsset} />
        <BaseAprField form={form} label={t("common.fields.utilizationApr")} />
        <PenaltyAprField form={form} />
        <ReserveRatioField form={form} />
        <CommitmentFeeField form={form} />
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
