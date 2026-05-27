import { useEffect, useState } from "react"

import { HooksKind } from "@wildcatfi/wildcat-sdk"
import {
  HooksInstance,
  HooksTemplate,
} from "@wildcatfi/wildcat-sdk/dist/access"

import { NewMarketFormType } from "./useNewMarketForm"
import { useGetBorrowerHooksData } from "../../hooks/useGetBorrowerHooksData"

const MARKET_TYPE_TO_HOOKS_KIND: Record<string, HooksKind | undefined> = {
  standard: HooksKind.OpenTerm,
  fixedTerm: HooksKind.FixedTerm,
  periodicTerm: HooksKind.PeriodicTerm,
}

const HOOKS_KIND_TO_MARKET_TYPE: Record<HooksKind, string> = {
  [HooksKind.OpenTerm]: "standard",
  [HooksKind.FixedTerm]: "fixedTerm",
  [HooksKind.PeriodicTerm]: "periodicTerm",
  [HooksKind.Unknown]: "",
}

export function useNewMarketHooksData(form: NewMarketFormType) {
  const { data: hooksData, ...queryData } = useGetBorrowerHooksData()
  const { setValue } = form
  const [selectedHooksInstance, setSelectedHooksInstance] = useState<
    HooksInstance | undefined
  >(undefined)
  const [selectedHooksTemplate, setSelectedHooksTemplate] = useState<
    HooksTemplate | undefined
  >(undefined)

  const policyValue = form.watch("policy")
  const marketType = form.watch("marketType")

  useEffect(() => {
    const selectedHooksKind = MARKET_TYPE_TO_HOOKS_KIND[marketType]
    if (hooksData && policyValue) {
      const { hooksInstances, hooksTemplates } = hooksData
      if (policyValue === "createNewPolicy") {
        const hooksTemplate = selectedHooksKind
          ? hooksTemplates.find(
              (template) =>
                template.kind === selectedHooksKind &&
                template.hooksTemplate.toLowerCase() !==
                  "0x7e49CabA6FB53CDc70CD98829731A2b8d76dfc36".toLowerCase(),
            )
          : undefined
        setSelectedHooksInstance(undefined)
        setSelectedHooksTemplate(hooksTemplate)
      } else {
        const hooksInstance = hooksInstances.find(
          (instance) =>
            instance.address.toLowerCase() === policyValue.toLowerCase(),
        )
        setSelectedHooksInstance(hooksInstance)
        setSelectedHooksTemplate(hooksInstance?.hooksTemplate)

        if (hooksInstance) {
          setValue(
            "marketType",
            HOOKS_KIND_TO_MARKET_TYPE[hooksInstance.kind],
            {
              shouldValidate: true,
            },
          )
          setValue(
            "accessControl",
            hooksInstance.roleProviders.length === 1
              ? "manualApproval"
              : "defaultPullProvider",
          )
          setValue("policyName", hooksInstance.name)
        } else {
          setValue("policyName", "")
        }
      }
    }
  }, [hooksData, marketType, policyValue, setValue])

  useEffect(() => {
    if (marketType === "fixedTerm") {
      setValue("allowClosureBeforeTerm", undefined)
      setValue("allowTermReduction", undefined)
    }
  }, [marketType, setValue])

  return {
    selectedHooksInstance,
    selectedHooksTemplate,
    hooksKind: MARKET_TYPE_TO_HOOKS_KIND[marketType] ?? HooksKind.Unknown,
    hooksInstances: hooksData?.hooksInstances ?? [],
    hooksTemplates: hooksData?.hooksTemplates ?? [],
    ...queryData,
  }
}
