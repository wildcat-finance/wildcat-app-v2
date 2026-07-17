import { BorrowerProfileAnalytics } from "@/app/[locale]/borrower/profile/hooks/analytics/types"
import { formatPercent, formatUsd } from "@/components/Profile/shared/analytics"
import { METRIC_BASIS } from "@/components/Profile/shared/metricBasis"

export const buildBorrowerSummaryItems = (
  analytics: BorrowerProfileAnalytics | undefined,
) => {
  const totalDebt = analytics?.totalDebt
  const totalCapacity = analytics?.totalCapacity
  const avgApr = analytics?.avgApr

  return [
    {
      label: "Total debt",
      value:
        totalDebt === undefined ? "—" : formatUsd(totalDebt, { compact: true }),
      tooltip: METRIC_BASIS.analyticsDebtUsd,
      fullPrecisionValue:
        totalDebt === undefined
          ? undefined
          : formatUsd(totalDebt, { maximumFractionDigits: 2 }),
    },
    {
      label: "Total capacity",
      value:
        totalCapacity === undefined
          ? "—"
          : formatUsd(totalCapacity, { compact: true }),
      tooltip: `Aggregate max supply across active markets. ${METRIC_BASIS.currentUsd}`,
      fullPrecisionValue:
        totalCapacity === undefined
          ? undefined
          : formatUsd(totalCapacity, { maximumFractionDigits: 2 }),
    },
    {
      label: "Debt-weighted APR",
      value: avgApr === undefined ? "—" : formatPercent(avgApr),
      tooltip:
        "Base APR weighted by each market's analytics USD debt snapshot; excludes protocol and penalty fees.",
    },
    {
      label: "Total borrowed",
      value: formatUsd(analytics?.totalBorrowed ?? 0, { compact: true }),
      tooltip: `All-time borrowed volume. ${METRIC_BASIS.historicalUsd}`,
      fullPrecisionValue: formatUsd(analytics?.totalBorrowed ?? 0, {
        maximumFractionDigits: 2,
      }),
    },
    {
      label: "Total repaid",
      value: formatUsd(analytics?.totalRepaid ?? 0, { compact: true }),
      tooltip: `All-time repaid volume. ${METRIC_BASIS.historicalUsd}`,
      fullPrecisionValue: formatUsd(analytics?.totalRepaid ?? 0, {
        maximumFractionDigits: 2,
      }),
    },
  ]
}
