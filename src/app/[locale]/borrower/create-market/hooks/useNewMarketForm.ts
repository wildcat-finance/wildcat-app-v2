import { useMemo } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import {
  DefaultV2ParameterConstraints,
  MarketParameterConstraints,
} from "@wildcatfi/wildcat-sdk"
import { useForm, UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import {
  MarketValidationSchemaType,
  createBaseMarketSchemaObject,
  marketRefinementCallback,
} from "@/app/[locale]/borrower/create-market/validation/validationSchema"
import { formatConstrainToNumber } from "@/utils/formatters"

export const defaultMarketForm: Partial<MarketValidationSchemaType> = {
  marketType: "",
  maxTotalSupply: undefined,
  annualInterestBips: undefined,
  delinquencyFeeBips: undefined,
  reserveRatioBips: undefined,
  minimumDeposit: undefined,
  delinquencyGracePeriod: undefined,
  withdrawalBatchDuration: undefined,
  fixedTermEndTime: undefined,
  allowClosureBeforeTerm: false,
  allowTermReduction: false,
  allowForceBuyBack: false,
  policy: "",
  policyName: "",
  accessControl: "",
  mla: "noMLA",
  marketName: "aa",
  asset: "0x",
  namePrefix: "",
  symbolPrefix: "",
  disableTransfers: false,
  transferRequiresAccess: false,
  depositRequiresAccess: true,
  withdrawalRequiresAccess: false,
}

function getValidationSchema(
  constraints: MarketParameterConstraints,
  isTestnet: boolean,
  maxLabel: string,
) {
  const getFormattedConstrain = (key: keyof MarketParameterConstraints) =>
    formatConstrainToNumber(constraints, key)

  const baseObjectSchema = createBaseMarketSchemaObject(isTestnet, maxLabel)

  return baseObjectSchema
    .extend({
      delinquencyGracePeriod: baseObjectSchema.shape.delinquencyGracePeriod
        .min(getFormattedConstrain("minimumDelinquencyGracePeriod"))
        .max(getFormattedConstrain("maximumDelinquencyGracePeriod")),
      reserveRatioBips: baseObjectSchema.shape.reserveRatioBips
        .min(getFormattedConstrain("minimumReserveRatioBips"))
        .max(getFormattedConstrain("maximumReserveRatioBips")),
      delinquencyFeeBips: baseObjectSchema.shape.delinquencyFeeBips
        .min(getFormattedConstrain("minimumDelinquencyFeeBips"))
        .max(getFormattedConstrain("maximumDelinquencyFeeBips")),
      withdrawalBatchDuration: baseObjectSchema.shape.withdrawalBatchDuration
        .min(getFormattedConstrain("minimumWithdrawalBatchDuration"))
        .max(getFormattedConstrain("maximumWithdrawalBatchDuration")),
      annualInterestBips: baseObjectSchema.shape.annualInterestBips
        .min(getFormattedConstrain("minimumAnnualInterestBips"))
        .max(getFormattedConstrain("maximumAnnualInterestBips")),
    })
    .superRefine(marketRefinementCallback)
}

export type NewMarketFormType = UseFormReturn<MarketValidationSchemaType>

export const useNewMarketForm = (isTestnet: boolean): NewMarketFormType => {
  const { t } = useTranslation()
  const maxLabel = isTestnet
    ? t("utils.time.oneYear")
    : t("utils.time.twoYears")

  const validationSchemaAsync = useMemo(
    () =>
      getValidationSchema(DefaultV2ParameterConstraints, isTestnet, maxLabel),
    [isTestnet, maxLabel],
  )

  const form = useForm<MarketValidationSchemaType>({
    defaultValues: defaultMarketForm,
    resolver: zodResolver(validationSchemaAsync),
    mode: "onBlur",
  })

  return form
}
