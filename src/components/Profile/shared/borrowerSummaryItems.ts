import { BorrowerProfileAnalytics } from "@/app/[locale]/borrower/profile/hooks/analytics/types"
import { formatPercent, formatUsd } from "@/components/Profile/shared/analytics"

export const buildBorrowerSummaryItems = (
  analytics: BorrowerProfileAnalytics | undefined,
) => [
  {
    label: "Total debt",
    value: formatUsd(analytics?.totalDebt ?? 0, { compact: true }),
    tooltip: "Current debt across all active markets.",
    fullPrecisionValue: formatUsd(analytics?.totalDebt ?? 0, {
      maximumFractionDigits: 2,
    }),
  },
  {
    label: "Total capacity",
    value: formatUsd(analytics?.totalCapacity ?? 0, { compact: true }),
    tooltip: "Aggregate max supply across active markets.",
    fullPrecisionValue: formatUsd(analytics?.totalCapacity ?? 0, {
      maximumFractionDigits: 2,
    }),
  },
  {
    label: "Debt-weighted APR",
    value: formatPercent(analytics?.avgApr ?? 0),
    tooltip: "Base APR weighted by each market's current debt.",
  },
  {
    label: "Total borrowed",
    value: formatUsd(analytics?.totalBorrowed ?? 0, { compact: true }),
    tooltip: "All-time borrowed volume.",
    fullPrecisionValue: formatUsd(analytics?.totalBorrowed ?? 0, {
      maximumFractionDigits: 2,
    }),
  },
  {
    label: "Total repaid",
    value: formatUsd(analytics?.totalRepaid ?? 0, { compact: true }),
    tooltip: "All-time repaid volume.",
    fullPrecisionValue: formatUsd(analytics?.totalRepaid ?? 0, {
      maximumFractionDigits: 2,
    }),
  },
]
