import { useEffect, useState } from "react"

import {
  getHooksFactoryAddressForMarketType,
  hasHooksFactoryDeployment,
  HooksKind,
  type MarketType,
} from "@wildcatfi/wildcat-sdk"
import {
  type HooksInstance,
  type HooksTemplate,
} from "@wildcatfi/wildcat-sdk/dist/access"

import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"

import { NewMarketFormType } from "./useNewMarketForm"
import { useGetBorrowerHooksData } from "../../hooks/useGetBorrowerHooksData"

type FactoryScopedHooksData = {
  hooksFactory?: string
}

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

function getDeployableHooksTemplate({
  hooksTemplates,
  hooksKind,
  targetHooksFactory,
  targetMarketType,
}: {
  hooksTemplates: HooksTemplate[]
  hooksKind: HooksKind
  targetHooksFactory: string | undefined
  targetMarketType: MarketType
}) {
  return hooksTemplates.find(
    (hooksTemplate) =>
      hooksTemplate.kind === hooksKind &&
      hooksTemplate.enabled &&
      matchesTargetHooksFactory(
        hooksTemplate as FactoryScopedHooksData,
        targetHooksFactory,
        targetMarketType,
      ),
  )
}

export function useNewMarketHooksData(form: NewMarketFormType) {
  const { data: hooksData, ...queryData } = useGetBorrowerHooksData()
  const { chainId } = useCurrentNetwork()
  const { getValues, setValue } = form
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
    const selectedHooksKind = MARKET_TYPE_TO_HOOKS_KIND[marketType]
    if (hooksData && policyValue) {
      const hooksInstances = hooksData.hooksInstances.filter((instance) =>
        matchesTargetHooksFactory(
          instance as FactoryScopedHooksData,
          targetHooksFactory,
          targetMarketType,
        ),
      )
      if (policyValue === "createNewPolicy") {
        const hooksTemplate = selectedHooksKind
          ? getDeployableHooksTemplate({
              hooksTemplates: hooksData.hooksTemplates,
              hooksKind: selectedHooksKind,
              targetHooksFactory,
              targetMarketType,
            })
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
  }, [
    hooksData,
    marketType,
    policyValue,
    setValue,
    targetHooksFactory,
    targetMarketType,
  ])

  useEffect(() => {
    if (marketType === "fixedTerm") {
      setValue(
        "allowClosureBeforeTerm",
        getValues("allowClosureBeforeTerm") ?? false,
      )
      setValue("allowTermReduction", getValues("allowTermReduction") ?? false)
      setValue("firstWithdrawalWindowStart", undefined)
      setValue("periodDuration", undefined)
      setValue("withdrawalWindowDuration", undefined)
    } else if (marketType === "periodicTerm") {
      setValue("allowClosureBeforeTerm", undefined)
      setValue("allowTermReduction", undefined)
      setValue("fixedTermEndTime", undefined)
    } else {
      setValue("fixedTermEndTime", undefined)
      setValue("firstWithdrawalWindowStart", undefined)
      setValue("periodDuration", undefined)
      setValue("withdrawalWindowDuration", undefined)
      setValue("allowClosureBeforeTerm", undefined)
      setValue("allowTermReduction", undefined)
    }
  }, [getValues, marketType, setValue])

  return {
    selectedHooksInstance,
    selectedHooksTemplate,
    hooksKind: MARKET_TYPE_TO_HOOKS_KIND[marketType] ?? HooksKind.Unknown,
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
