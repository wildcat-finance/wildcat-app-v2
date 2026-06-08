import { BorrowerProfileAnalytics } from "@/app/[locale]/borrower/profile/hooks/analytics/types"
import { formatPercent, formatUsd } from "@/components/Profile/shared/analytics"
import { METRIC_BASIS } from "@/components/Profile/shared/metricBasis"

export const buildBorrowerSummaryItems = (
  analytics: BorrowerProfileAnalytics | undefined,
) => [
  {
    label: "Total debt",
    value: formatUsd(analytics?.totalDebt ?? 0, { compact: true }),
    tooltip: METRIC_BASIS.analyticsDebtUsd,
    fullPrecisionValue: formatUsd(analytics?.totalDebt ?? 0, {
      maximumFractionDigits: 2,
    }),
  },
  {
    label: "Total capacity",
    value: formatUsd(analytics?.totalCapacity ?? 0, { compact: true }),
    tooltip: `Aggregate max supply across active markets. ${METRIC_BASIS.currentUsd}`,
    fullPrecisionValue: formatUsd(analytics?.totalCapacity ?? 0, {
      maximumFractionDigits: 2,
    }),
  },
  {
    label: "Debt-weighted APR",
    value: formatPercent(analytics?.avgApr ?? 0),
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
