"use client"

import * as React from "react"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { ROUTES } from "@/routes"

export type ProfileTabDef<T extends string> = {
  value: T
  label: string
  description: string
}

export type LenderProfileTab =
  | "overview"
  | "activity"
  | "markets"
  | "lender-charts"
export type BorrowerProfileTab = "overview" | "delinquency" | "borrower-charts"

export const LENDER_PROFILE_TABS: ProfileTabDef<LenderProfileTab>[] = [
  {
    value: "overview",
    label: "Lender Overview",
    description: "Profile, active positions, and borrower concentration.",
  },
  {
    value: "activity",
    label: "Activity & Cash Flow",
    description: "Deposits, withdrawals, cash flow, and batch status.",
  },
  {
    value: "markets",
    label: "Markets & Interest",
    description: "All market history and return attribution.",
  },
  {
    value: "lender-charts",
    label: "[preview] lender charts",
    description: "Yield, withdrawal pressure, and capital-at-risk history.",
  },
]

export const BORROWER_PROFILE_TABS: ProfileTabDef<BorrowerProfileTab>[] = [
  {
    value: "overview",
    label: "Borrower Overview",
    description: "Identity, aggregate KPIs, and active markets.",
  },
  {
    value: "delinquency",
    label: "Withdrawals & Delinquency",
    description: "Delinquency track record and withdrawal analytics.",
  },
  {
    value: "borrower-charts",
    label: "[preview] borrower charts",
    description: "Cure velocity, realized capital cost, and APR drift.",
  },
]

export const useProfileTab = <T extends string>(
  tabs: ProfileTabDef<T>[],
  defaultTab: T,
) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const allowed = React.useMemo(
    () => new Set(tabs.map((tab) => tab.value)),
    [tabs],
  )

  const currentTab = React.useMemo<T>(() => {
    const tab = searchParams.get("tab") as T | null
    return tab && allowed.has(tab) ? tab : defaultTab
  }, [searchParams, allowed, defaultTab])

  const setCurrentTab = React.useCallback(
    (nextTab: T) => {
      const next = new URLSearchParams(searchParams.toString())
      next.set("tab", nextTab)
      router.replace(`${pathname}?${next.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  return { currentTab, setCurrentTab }
}

export const resolveProfileTabs = (pathname: string) => {
  if (pathname.includes(ROUTES.lender.profile)) {
    return {
      kind: "lender" as const,
      tabs: LENDER_PROFILE_TABS,
      defaultTab: "overview" as LenderProfileTab,
    }
  }
  if (pathname.includes(ROUTES.borrower.profile)) {
    return {
      kind: "borrower" as const,
      tabs: BORROWER_PROFILE_TABS,
      defaultTab: "overview" as BorrowerProfileTab,
    }
  }
  return null
}
