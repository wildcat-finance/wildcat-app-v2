import { Box, SvgIcon, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import MediumWarning from "@/assets/icons/mediumWarning_icon.svg"
import { InputLabel } from "@/components/InputLabel"
import { NumberTextField } from "@/components/NumberTextfield"
import { TextfieldChip } from "@/components/TextfieldAdornments/TextfieldChip"
import { COLORS } from "@/theme/colors"

import { FinancialFormProps } from "./interface"
import { endDecorator } from "./style"

type FinancialFieldProps = Pick<FinancialFormProps, "form">
type TokenFinancialFieldProps = Pick<FinancialFormProps, "form" | "tokenAsset">

export const CapacityField = ({
  form,
  tokenAsset,
}: TokenFinancialFieldProps) => {
  const { t } = useTranslation()
  const {
    getValues,
    setValue,
    formState: { errors },
  } = form

  return (
    <InputLabel label={t("borrower.createMarket.financial.maxCapacity.label")}>
      <NumberTextField
        label={t("borrower.createMarket.financial.maxCapacity.placeholder")}
        value={getValues("maxTotalSupply")}
        decimalScale={tokenAsset?.decimals}
        // onBlur={(v) => {
        //   setValue(
        //     "maxTotalSupply",
        //     parseFloat(v.target.value.replaceAll(",", "")) as number,
        //   )
        // }}
        onValueChange={(v) => {
          setValue("maxTotalSupply", v.floatValue as number)
        }}
        error={Boolean(errors.maxTotalSupply)}
        helperText={errors.maxTotalSupply?.message}
        thousandSeparator
        endAdornment={
          <TextfieldChip
            size="regular"
            text={tokenAsset?.symbol || `${t("common.fields.tokenSymbol")}`}
          />
        }
      />
    </InputLabel>
  )
}

export const BaseAprField = ({
  form,
  label,
}: FinancialFieldProps & { label: string }) => {
  const { t } = useTranslation()
  const {
    getValues,
    register,
    formState: { errors },
  } = form

  return (
    <InputLabel label={label}>
      <NumberTextField
        min={0}
        max={100}
        decimalScale={2}
        label={t("common.placeholders.range0to100")}
        value={getValues("annualInterestBips")}
        error={Boolean(errors.annualInterestBips)}
        helperText={errors.annualInterestBips?.message}
        endAdornment={
          <Typography variant="text2" sx={endDecorator}>
            {t("common.units.percent")}
          </Typography>
        }
        {...register("annualInterestBips")}
      />
    </InputLabel>
  )
}

export const PenaltyAprField = ({ form }: FinancialFieldProps) => {
  const { t } = useTranslation()
  const {
    getValues,
    register,
    formState: { errors },
  } = form

  return (
    <InputLabel label={t("common.fields.penaltyApr")}>
      <NumberTextField
        min={0}
        max={100}
        decimalScale={2}
        label={t("common.placeholders.range0to100")}
        value={getValues("delinquencyFeeBips")}
        error={Boolean(errors.delinquencyFeeBips)}
        helperText={errors.delinquencyFeeBips?.message}
        endAdornment={
          <Typography variant="text2" sx={endDecorator}>
            {t("common.units.percent")}
          </Typography>
        }
        {...register("delinquencyFeeBips")}
      />
    </InputLabel>
  )
}

export const ReserveRatioField = ({ form }: FinancialFieldProps) => {
  const { t } = useTranslation()
  const {
    getValues,
    register,
    formState: { errors },
  } = form

  return (
    <InputLabel label={t("common.fields.reserveRatio")}>
      <NumberTextField
        label={t("common.placeholders.range0to100")}
        min={0}
        max={100}
        decimalScale={2}
        value={getValues("reserveRatioBips")}
        error={Boolean(errors.reserveRatioBips)}
        helperText={errors.reserveRatioBips?.message}
        endAdornment={
          <Typography variant="text2" sx={endDecorator}>
            {t("common.units.percent")}
          </Typography>
        }
        {...register("reserveRatioBips")}
      />
    </InputLabel>
  )
}

export const CommitmentFeeField = ({ form }: FinancialFieldProps) => {
  const { t } = useTranslation()
  const {
    getValues,
    setValue,
    formState: { errors },
  } = form

  return (
    <InputLabel
      label={t("borrower.createMarket.financial.commitmentFee.label")}
    >
      <NumberTextField
        min={0}
        max={100}
        decimalScale={2}
        label={t("common.placeholders.range0to100")}
        value={getValues("commitmentFeePercent")}
        error={Boolean(errors.commitmentFeePercent)}
        helperText={errors.commitmentFeePercent?.message}
        endAdornment={
          <Typography variant="text2" sx={{ color: COLORS.santasGrey }}>
            {t("borrower.createMarket.financial.commitmentFee.chip")}
          </Typography>
        }
        onValueChange={(v) => {
          setValue("commitmentFeePercent", v.floatValue as number, {
            shouldTouch: true,
            shouldValidate: true,
          })
        }}
      />
    </InputLabel>
  )
}

export const GracePeriodField = ({ form }: FinancialFieldProps) => {
  const { t } = useTranslation()
  const {
    register,
    watch,
    formState: { errors },
  } = form
  const delinquencyGracePeriod = watch("delinquencyGracePeriod")

  return (
    <InputLabel label={t("borrower.createMarket.periods.grace.label")}>
      <NumberTextField
        decimalScale={2}
        label={t("common.placeholders.range0to2160")}
        value={delinquencyGracePeriod}
        error={Boolean(errors.delinquencyGracePeriod)}
        helperText={errors.delinquencyGracePeriod?.message}
        endAdornment={
          <Typography variant="text2" sx={{ color: COLORS.santasGrey }}>
            {t("common.units.hours")}
          </Typography>
        }
        {...register("delinquencyGracePeriod")}
      />
    </InputLabel>
  )
}

export const WithdrawalCycleField = ({ form }: FinancialFieldProps) => {
  const { t } = useTranslation()
  const {
    register,
    watch,
    formState: { errors },
  } = form
  const withdrawalBatchDuration = watch("withdrawalBatchDuration")

  return (
    <InputLabel label={t("common.fields.withdrawalCycleDuration")}>
      <NumberTextField
        decimalScale={2}
        label={t("common.placeholders.range0to2160")}
        value={withdrawalBatchDuration}
        error={Boolean(errors.withdrawalBatchDuration)}
        helperText={errors.withdrawalBatchDuration?.message}
        endAdornment={
          <Typography variant="text2" sx={{ color: COLORS.santasGrey }}>
            {t("common.units.hours")}
          </Typography>
        }
        {...register("withdrawalBatchDuration")}
      />
    </InputLabel>
  )
}

export const MinimumDepositField = ({
  form,
  tokenAsset,
}: TokenFinancialFieldProps) => {
  const { t } = useTranslation()
  const {
    getValues,
    setValue,
    formState: { errors },
  } = form

  return (
    <InputLabel
      label={t("common.fields.minimumDeposit")}
      subtitle={t("borrower.createMarket.financial.minDeposit.explainer")}
      margin="36px 0 0 0"
    >
      <NumberTextField
        label={t("borrower.createMarket.financial.minDeposit.placeholder")}
        max={getValues("maxTotalSupply")}
        value={getValues("minimumDeposit")}
        onValueChange={(v) => {
          setValue("minimumDeposit", (v.floatValue as number) ?? 0)
        }}
        error={Boolean(errors.minimumDeposit)}
        helperText={errors.minimumDeposit?.message}
        decimalScale={tokenAsset?.decimals}
        thousandSeparator
        style={{ maxWidth: "50%" }}
        endAdornment={
          <TextfieldChip
            size="regular"
            text={tokenAsset?.symbol || `${t("common.fields.tokenSymbol")}`}
          />
        }
      />
    </InputLabel>
  )
}

export const GraceVsWithdrawalWarning = ({ show }: { show: boolean }) => {
  const { t } = useTranslation()

  if (!show) return null

  return (
    <Box
      sx={{
        gridColumn: "1 / -1",
        display: "flex",
        alignItems: "flex-start",
        gap: "8px",
        borderRadius: "12px",
        padding: "12px",
        backgroundColor: COLORS.oasis,
      }}
    >
      <SvgIcon sx={{ fontSize: "16px", marginTop: "2px" }}>
        <MediumWarning />
      </SvgIcon>
      <Typography variant="text3" sx={{ color: COLORS.butteredRum }}>
        {t("borrower.createMarket.periods.graceVsWithdrawalWarning")}
      </Typography>
    </Box>
  )
}
