import {
  DeployableMarketKind,
  getHooksFactoryDeploymentAbi,
  getRepaymentTermsStatus,
  MarketParameterConstraints,
  SupportedChainId,
} from "@wildcatfi/wildcat-sdk"

export type RepaymentConstraints = Pick<
  MarketParameterConstraints,
  "maximumRepaymentPeriod" | "maximumRepaymentDateDelay"
>

// The shared schema checks constructor bounds. Policy-specific bounds are
// checked with the selected instance in the form and before signing/deployment.
export const CORE_REPAYMENT_CONSTRAINTS: RepaymentConstraints = {
  maximumRepaymentPeriod: 0xffffffff,
  maximumRepaymentDateDelay: 0xffffffff,
}

export type RepaymentFormValues = {
  scheduleRepayment?: boolean
  repaymentDate?: number
  repaymentPeriod?: number
  marketType?: string
  fixedTermEndTime?: number
}

export const supportsRepaymentSchedule = (
  chainId: SupportedChainId,
  marketKind: DeployableMarketKind,
) => {
  try {
    return getHooksFactoryDeploymentAbi(chainId, marketKind).some(
      (item) =>
        item.type === "function" &&
        item.name === "deployMarket" &&
        item.inputs.some(
          (input) =>
            "components" in input &&
            input.components.some((field) => field.name === "repaymentDate"),
        ),
    )
  } catch {
    return false
  }
}

export const getRepaymentDeploymentTerms = (values: RepaymentFormValues) => ({
  repaymentDate: values.scheduleRepayment ? values.repaymentDate : 0,
  repaymentPeriod: values.scheduleRepayment ? values.repaymentPeriod : 0,
})

export const getRepaymentTermIssues = (
  values: RepaymentFormValues,
  constraints?: RepaymentConstraints,
  now = Math.floor(Date.now() / 1000),
): { path: "repaymentDate" | "repaymentPeriod"; message: string }[] => {
  if (!values.scheduleRepayment) return []
  const { repaymentDate, repaymentPeriod } = values
  const issues: ReturnType<typeof getRepaymentTermIssues> = []
  // Defaults for the built-in v2.5.6 policies (MarketConstraintHooks and
  // FixedTermPolicy). Reused instances supply their own lens-read constraints.
  const maximumPeriod = constraints?.maximumRepaymentPeriod ?? 90 * 86400
  const maximumDelay =
    constraints?.maximumRepaymentDateDelay ??
    (values.marketType === "fixedTerm" ? 0xffffffff : 730 * 86400)

  if (
    repaymentDate === undefined ||
    !Number.isSafeInteger(repaymentDate) ||
    repaymentDate <= now
  ) {
    issues.push({
      path: "repaymentDate",
      message: "Set a repayment date in the future (UTC).",
    })
  } else if (repaymentDate > now + maximumDelay) {
    issues.push({
      path: "repaymentDate",
      message: "The repayment date exceeds this policy's maximum delay.",
    })
  } else if (
    values.marketType === "fixedTerm" &&
    values.fixedTermEndTime !== undefined &&
    repaymentDate < values.fixedTermEndTime
  ) {
    issues.push({
      path: "repaymentDate",
      message: "Repayment cannot start before the fixed-term maturity date.",
    })
  }

  if (
    repaymentPeriod === undefined ||
    !Number.isSafeInteger(repaymentPeriod) ||
    repaymentPeriod < 0 ||
    repaymentPeriod > maximumPeriod
  ) {
    issues.push({
      path: "repaymentPeriod",
      message: `Enter a repayment period between 0 and ${
        maximumPeriod / 3600
      } hours.`,
    })
  }

  if (
    issues.length === 0 &&
    getRepaymentTermsStatus(
      SupportedChainId.Sepolia,
      repaymentDate!,
      repaymentPeriod!,
      now,
    )
  ) {
    issues.push({
      path: "repaymentDate",
      message: "The repayment deadline exceeds the supported date range.",
    })
  }
  return issues
}
