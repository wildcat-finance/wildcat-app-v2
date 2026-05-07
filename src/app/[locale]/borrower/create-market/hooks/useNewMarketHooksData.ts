import { useEffect, useState } from "react"

import {
  getHooksFactoryAddressForMarketType,
  hasHooksFactoryDeployment,
  HooksKind,
  type MarketType,
} from "@wildcatfi/wildcat-sdk"
import {
  HooksInstance,
  HooksTemplate,
} from "@wildcatfi/wildcat-sdk/dist/access"

import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"

import { NewMarketFormType } from "./useNewMarketForm"
import { useGetBorrowerHooksData } from "../../hooks/useGetBorrowerHooksData"

type FactoryScopedHooksData = {
  hooksFactory?: string
}

function matchesTargetHooksFactory(
  item: FactoryScopedHooksData,
  targetHooksFactory: string | undefined,
  targetMarketType: MarketType,
) {
  const hooksFactory = item.hooksFactory?.toLowerCase()
  if (!hooksFactory) {
    return targetMarketType === "legacy"
  }
  return hooksFactory === targetHooksFactory
}

export function useNewMarketHooksData(form: NewMarketFormType) {
  const { data: hooksData, ...queryData } = useGetBorrowerHooksData()
  const { chainId } = useCurrentNetwork()
  const [selectedHooksInstance, setSelectedHooksInstance] = useState<
    HooksInstance | undefined
  >(undefined)
  const [selectedHooksTemplate, setSelectedHooksTemplate] = useState<
    HooksTemplate | undefined
  >(undefined)

  const policyValue = form.watch("policy")
  const marketType = form.watch("marketType")
  const implementationType = form.watch("implementationType")
  const targetMarketType: MarketType =
    implementationType === "revolving" ? "revolving" : "legacy"
  const targetHooksFactory =
    chainId && hasHooksFactoryDeployment(chainId, targetMarketType)
      ? getHooksFactoryAddressForMarketType(
          chainId,
          targetMarketType,
        ).toLowerCase()
      : undefined

  useEffect(() => {
    const selectedHooksKind =
      marketType === "standard" ? HooksKind.OpenTerm : HooksKind.FixedTerm
    if (hooksData && policyValue) {
      const hooksInstances = hooksData.hooksInstances.filter((instance) =>
        matchesTargetHooksFactory(
          instance as FactoryScopedHooksData,
          targetHooksFactory,
          targetMarketType,
        ),
      )
      const hooksTemplates = hooksData.hooksTemplates.filter((template) =>
        matchesTargetHooksFactory(
          template as FactoryScopedHooksData,
          targetHooksFactory,
          targetMarketType,
        ),
      )
      if (policyValue === "createNewPolicy") {
        const hooksTemplate = hooksTemplates.find(
          (template) =>
            template.kind === selectedHooksKind &&
            template.hooksTemplate.toLowerCase() !==
              "0x7e49CabA6FB53CDc70CD98829731A2b8d76dfc36".toLowerCase(),
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
            {
              shouldValidate: true,
            },
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
  }, [
    form,
    hooksData,
    marketType,
    policyValue,
    targetHooksFactory,
    targetMarketType,
  ])

  useEffect(() => {
    if (marketType === "fixedTerm") {
      form.setValue("allowClosureBeforeTerm", undefined)
      form.setValue("allowTermReduction", undefined)
    }
  }, [form, marketType])

  return {
    selectedHooksInstance,
    selectedHooksTemplate,
    hooksKind:
      marketType === "standard" ? HooksKind.OpenTerm : HooksKind.FixedTerm,
    hooksInstances:
      hooksData?.hooksInstances.filter((instance) =>
        matchesTargetHooksFactory(
          instance as FactoryScopedHooksData,
          targetHooksFactory,
          targetMarketType,
        ),
      ) ?? [],
    hooksTemplates:
      hooksData?.hooksTemplates.filter((template) =>
        matchesTargetHooksFactory(
          template as FactoryScopedHooksData,
          targetHooksFactory,
          targetMarketType,
        ),
      ) ?? [],
    ...queryData,
  }
}
