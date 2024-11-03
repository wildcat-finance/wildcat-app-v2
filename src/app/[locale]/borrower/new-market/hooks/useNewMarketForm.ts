import { useMemo, useEffect } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { HooksKind, MarketParameterConstraints } from "@wildcatfi/wildcat-sdk"
import { useForm } from "react-hook-form"

import {
  MarketValidationSchemaType,
  marketValidationSchema as vschema,
} from "@/app/[locale]/borrower/new-market/validation/validationSchema"
import { useGetController } from "@/hooks/useGetController"
import { mockedMarketTypes } from "@/mocks/mocks"
import { formatConstrainToNumber } from "@/utils/formatters"

import { useGetBorrowerHooksData } from "../../hooks/useGetBorrowerHooksData"

export const defaultMarketForm: Partial<MarketValidationSchemaType> = {
  marketType: mockedMarketTypes[0].value,
  maxTotalSupply: undefined,
  annualInterestBips: undefined,
  delinquencyFeeBips: undefined,
  reserveRatioBips: undefined,
  minimumDeposit: 0,
  delinquencyGracePeriod: undefined,
  withdrawalBatchDuration: undefined,
  fixedTermEndTime: undefined,
  allowClosureBeforeTerm: undefined,
  allowTermReduction: undefined,
  policy: "createNewPolicy",
  policyName: "",
  kyc: "",
  mla: "",
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
  const baseSchema = vschema._def.schema._def.schema

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

export const useNewMarketForm = () => {
  const { data: controller } = useGetController()
  const { data: hooksData } = useGetBorrowerHooksData()

  const validationSchemaAsync = useMemo(() => {
    if (controller?.constraints) {
      return getValidationSchema(controller.constraints)
    }

    return vschema
  }, [controller?.constraints])

  const form = useForm<MarketValidationSchemaType>({
    defaultValues: defaultMarketForm,
    resolver: zodResolver(validationSchemaAsync),
    mode: "onBlur",
  })

  const policyValue = form.watch("policy")
  const marketType = form.watch("marketType")

  useEffect(() => {
    if (
      policyValue &&
      policyValue !== "createNewPolicy" &&
      hooksData?.hooksInstances
    ) {
      const selectedHook = hooksData.hooksInstances.find(
        (instance) => instance.address === policyValue,
      )

      if (selectedHook) {
        form.setValue(
          "marketType",
          selectedHook.kind === HooksKind.OpenTerm ? "standard" : "fixedTerm",
        )
        form.setValue(
          "kyc",
          selectedHook.roleProviders.length === 1
            ? "manual-approval"
            : "notShare",
        )
        form.setValue("policyName", selectedHook.name)
      } else {
        form.setValue("policyName", "")
      }
    }
  }, [policyValue, hooksData?.hooksInstances])

  useEffect(() => {
    if (marketType === "fixedTerm") {
      form.setValue("allowClosureBeforeTerm", undefined)
      form.setValue("allowTermReduction", undefined)
    }
  }, [marketType, form.setValue])

  return form
}
