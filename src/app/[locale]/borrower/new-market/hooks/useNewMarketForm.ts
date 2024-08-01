import { useMemo } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { MarketParameterConstraints } from "@wildcatfi/wildcat-sdk"
import { useForm } from "react-hook-form"

import {
  MarketValidationSchemaType,
  marketValidationSchema as vschema,
} from "@/app/[locale]/borrower/new-market/validation/validationSchema"
import { useGetController } from "@/hooks/useGetController"
import { mockedMarketTypes } from "@/mocks/mocks"
import { formatConstrainToNumber } from "@/utils/formatters"

export const defaultMarketForm: Partial<MarketValidationSchemaType> = {
  marketType: mockedMarketTypes[0].value,
  maxTotalSupply: undefined,
  annualInterestBips: undefined,
  delinquencyFeeBips: undefined,
  reserveRatioBips: undefined,
  minimumDeposit: 0,
  delinquencyGracePeriod: undefined,
  withdrawalBatchDuration: undefined,
  kyc: "",
  mla: "",
  marketName: "",
  asset: "",
  namePrefix: "",
  symbolPrefix: "",
}

function getValidationSchema(constraints: MarketParameterConstraints) {
  const getFormattedConstrain = (key: keyof MarketParameterConstraints) =>
    formatConstrainToNumber(constraints, key)

  return vschema.extend({
    delinquencyGracePeriod: vschema.shape.delinquencyGracePeriod
      .min(getFormattedConstrain("minimumDelinquencyGracePeriod"))
      .max(getFormattedConstrain("maximumDelinquencyGracePeriod")),
    reserveRatioBips: vschema.shape.reserveRatioBips
      .min(getFormattedConstrain("minimumReserveRatioBips"))
      .max(getFormattedConstrain("maximumReserveRatioBips")),
    delinquencyFeeBips: vschema.shape.delinquencyFeeBips
      .min(getFormattedConstrain("minimumDelinquencyFeeBips"))
      .max(getFormattedConstrain("maximumDelinquencyFeeBips")),
    withdrawalBatchDuration: vschema.shape.withdrawalBatchDuration
      .min(getFormattedConstrain("minimumWithdrawalBatchDuration"))
      .max(getFormattedConstrain("maximumWithdrawalBatchDuration")),
    annualInterestBips: vschema.shape.annualInterestBips
      .min(getFormattedConstrain("minimumAnnualInterestBips"))
      .max(getFormattedConstrain("maximumAnnualInterestBips")),
  })
}

export const useNewMarketForm = () => {
  const { data: controller } = useGetController()

  const validationSchemaAsync = useMemo(() => {
    if (controller?.constraints) {
      return getValidationSchema(controller.constraints)
    }

    return vschema
  }, [controller?.constraints])

  return useForm<MarketValidationSchemaType>({
    defaultValues: defaultMarketForm,
    resolver: zodResolver(validationSchemaAsync),
    mode: "onBlur",
  })
}
