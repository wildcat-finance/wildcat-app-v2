import { useEffect, useState } from "react"

import {
  type DeployableMarketKind,
  getHooksFactoryAddress,
  getHooksTemplateDeploymentStatus,
  hasHooksFactoryDeployment,
  type HooksInstance,
  HooksKind,
  type HooksTemplate,
} from "@wildcatfi/wildcat-sdk"

import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { hasActiveLenderOnboardingRoleProvider } from "@/utils/marketCapabilities"

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

function isDeployableHooksTemplate(
  template: HooksTemplate,
  targetHooksFactory: string | undefined,
  targetMarketKind: DeployableMarketKind,
) {
  return (
    !!targetHooksFactory &&
    template.hooksFactory.toLowerCase() === targetHooksFactory &&
    getHooksTemplateDeploymentStatus(template, targetMarketKind) === undefined
  )
}

function getDeployableHooksTemplate({
  hooksTemplates,
  hooksKind,
  targetHooksFactory,
  targetMarketKind,
}: {
  hooksTemplates: HooksTemplate[]
  hooksKind: HooksKind
  targetHooksFactory: string | undefined
  targetMarketKind: DeployableMarketKind
}) {
  return hooksTemplates.find(
    (hooksTemplate) =>
      hooksTemplate.kind === hooksKind &&
      isDeployableHooksTemplate(
        hooksTemplate,
        targetHooksFactory,
        targetMarketKind,
      ),
  )
}

export function useNewMarketHooksData(
  form: NewMarketFormType,
  {
    preserveUnavailablePolicy = false,
  }: { preserveUnavailablePolicy?: boolean } = {},
) {
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
  const targetMarketKind: DeployableMarketKind = implementationType
  const targetHooksFactory =
    chainId && hasHooksFactoryDeployment(chainId, targetMarketKind)
      ? getHooksFactoryAddress(chainId, targetMarketKind).toLowerCase()
      : undefined

  useEffect(() => {
    const selectedHooksKind = MARKET_TYPE_TO_HOOKS_KIND[marketType]
    if (hooksData && policyValue) {
      const hooksInstances = hooksData.hooksInstances.filter((instance) =>
        isDeployableHooksTemplate(
          instance.hooksTemplate,
          targetHooksFactory,
          targetMarketKind,
        ),
      )
      if (policyValue === "createNewPolicy") {
        const hooksTemplate = selectedHooksKind
          ? getDeployableHooksTemplate({
              hooksTemplates: hooksData.hooksTemplates,
              hooksKind: selectedHooksKind,
              targetHooksFactory,
              targetMarketKind,
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
            hasActiveLenderOnboardingRoleProvider(hooksInstance.roleProviders)
              ? "defaultPullProvider"
              : "manualApproval",
          )
          setValue("policyName", hooksInstance.name)
        } else if (!preserveUnavailablePolicy) {
          setValue("policyName", "")
        }
      }
    }
  }, [
    hooksData,
    marketType,
    policyValue,
    preserveUnavailablePolicy,
    setValue,
    targetHooksFactory,
    targetMarketKind,
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
        isDeployableHooksTemplate(
          instance.hooksTemplate,
          targetHooksFactory,
          targetMarketKind,
        ),
      ) ?? [],
    hooksTemplates:
      hooksData?.hooksTemplates.filter((template) =>
        isDeployableHooksTemplate(
          template,
          targetHooksFactory,
          targetMarketKind,
        ),
      ) ?? [],
    ...queryData,
  }
}
