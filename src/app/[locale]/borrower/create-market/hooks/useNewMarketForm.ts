import { zodResolver } from "@hookform/resolvers/zod"
import {
  DefaultV2ParameterConstraints,
  MarketParameterConstraints,
} from "@wildcatfi/wildcat-sdk"
import { useForm, UseFormReturn } from "react-hook-form"

import {
  MarketValidationSchemaType,
  marketValidationSchema as vschema,
} from "@/app/[locale]/borrower/create-market/validation/validationSchema"
import { mockedMarketTypes } from "@/mocks/mocks"
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
  depositRequiresAccess: false,
  withdrawalRequiresAccess: false,
}

function getValidationSchema(constraints: MarketParameterConstraints) {
  const getFormattedConstrain = (key: keyof MarketParameterConstraints) =>
    formatConstrainToNumber(constraints, key)
  // eslint-disable-next-line no-underscore-dangle
  const baseSchema = vschema._def.schema

  return baseSchema.extend({
    delinquencyGracePeriod: baseSchema.shape.delinquencyGracePeriod
      .min(getFormattedConstrain("minimumDelinquencyGracePeriod"))
      .max(getFormattedConstrain("maximumDelinquencyGracePeriod")),
    reserveRatioBips: baseSchema.shape.reserveRatioBips
      .min(getFormattedConstrain("minimumReserveRatioBips"))
      .max(getFormattedConstrain("maximumReserveRatioBips")),
    delinquencyFeeBips: baseSchema.shape.delinquencyFeeBips
      .min(getFormattedConstrain("minimumDelinquencyFeeBips"))
      .max(getFormattedConstrain("maximumDelinquencyFeeBips")),
    withdrawalBatchDuration: baseSchema.shape.withdrawalBatchDuration
      .min(getFormattedConstrain("minimumWithdrawalBatchDuration"))
      .max(getFormattedConstrain("maximumWithdrawalBatchDuration")),
    annualInterestBips: baseSchema.shape.annualInterestBips
      .min(getFormattedConstrain("minimumAnnualInterestBips"))
      .max(getFormattedConstrain("maximumAnnualInterestBips")),
  })
}

export type NewMarketFormType = UseFormReturn<MarketValidationSchemaType>

export const useNewMarketForm = (): NewMarketFormType => {
  const validationSchemaAsync = getValidationSchema(
    DefaultV2ParameterConstraints,
  )

  const form = useForm<MarketValidationSchemaType>({
    defaultValues: defaultMarketForm,
    resolver: zodResolver(validationSchemaAsync),
    mode: "onBlur",
  })

  return form
}
