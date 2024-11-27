import { useEffect, useState } from "react"

import { HooksKind } from "@wildcatfi/wildcat-sdk"
import {
  HooksInstance,
  HooksTemplate,
} from "@wildcatfi/wildcat-sdk/dist/access"

import { NewMarketFormType } from "./useNewMarketForm"
import { useGetBorrowerHooksData } from "../../hooks/useGetBorrowerHooksData"

export function useNewMarketHooksData(form: NewMarketFormType) {
  const { data: hooksData, ...queryData } = useGetBorrowerHooksData()
  const [selectedHooksInstance, setSelectedHooksInstance] = useState<
    HooksInstance | undefined
  >(undefined)
  const [selectedHooksTemplate, setSelectedHooksTemplate] = useState<
    HooksTemplate | undefined
  >(undefined)

  const policyValue = form.watch("policy")
  const marketType = form.watch("marketType")

  const selectedHooksKind =
    marketType === "standard" ? HooksKind.OpenTerm : HooksKind.FixedTerm

  useEffect(() => {
    if (hooksData && policyValue) {
      const { hooksInstances, hooksTemplates } = hooksData
      if (policyValue === "createNewPolicy") {
        const hooksTemplate = hooksTemplates.find(
          (template) => template.kind === selectedHooksKind,
        )
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
          form.setValue(
            "marketType",
            hooksInstance.kind === HooksKind.OpenTerm
              ? "standard"
              : "fixedTerm",
          )
          form.setValue(
            "accessControl",
            hooksInstance.roleProviders.length === 1
              ? "manualApproval"
              : "defaultPullProvider",
          )
          form.setValue("policyName", hooksInstance.name)
        } else {
          form.setValue("policyName", "")
        }
      }
    }
  }, [hooksData, policyValue])

  useEffect(() => {
    if (marketType === "fixedTerm") {
      form.setValue("allowClosureBeforeTerm", undefined)
      form.setValue("allowTermReduction", undefined)
    }
  }, [marketType, form.setValue])

  return {
    selectedHooksInstance,
    selectedHooksTemplate,
    hooksKind: selectedHooksKind,
    hooksInstances: hooksData?.hooksInstances ?? [],
    hooksTemplates: hooksData?.hooksTemplates ?? [],
    ...queryData,
  }
}
