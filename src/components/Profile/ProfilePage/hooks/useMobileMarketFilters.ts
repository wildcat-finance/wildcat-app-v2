import { useMemo, useState } from "react"

import { HooksKind, Market } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import type { MobileFilterButtonProps } from "@/components/Mobile/MobileFilterButton"
import type {
  MobileMarketSortDir,
  MobileMarketSortField,
} from "@/components/Mobile/MobileMarketList"
import type { SmallFilterSelectItem } from "@/components/SmallFilterSelect"
import { filterMarkets, WITHDRAWAL_CYCLE_FILTER_OPTIONS } from "@/utils/filters"
import { MarketStatus } from "@/utils/marketStatus"

const DEFAULT_SORT_FIELD: MobileMarketSortField = "debt"
const DEFAULT_SORT_DIR: MobileMarketSortDir = "desc"

const SORT_FIELDS: MobileMarketSortField[] = [
  "debt",
  "apr",
  "capacity",
  "withdrawal",
  "name",
]

const isSortField = (field: string): field is MobileMarketSortField =>
  (SORT_FIELDS as string[]).includes(field)

const STATUS_TABS = [
  { status: MarketStatus.HEALTHY, labelKey: "common.labels.healthy" },
  { status: MarketStatus.DELINQUENT, labelKey: "common.labels.pending" },
  { status: MarketStatus.PENALTY, labelKey: "common.labels.penalty" },
] as const

type StatusTab = "all" | (typeof STATUS_TABS)[number]["status"]

const isStatusTab = (id: string): id is StatusTab =>
  id === "all" || STATUS_TABS.some((tab) => tab.status === id)

const byStatus = (status: MarketStatus) => [{ id: status, name: status }]

export const useMobileMarketFilters = (markets: Market[]) => {
  const { t } = useTranslation()

  const [status, setStatus] = useState<StatusTab>("all")
  const [assets, setAssets] = useState<SmallFilterSelectItem[]>([])
  const [withdrawalCycles, setWithdrawalCycles] = useState<
    SmallFilterSelectItem[]
  >([])
  const [terms, setTerms] = useState<SmallFilterSelectItem[]>([])
  const [sortField, setSortField] =
    useState<MobileMarketSortField>(DEFAULT_SORT_FIELD)
  const [sortDir, setSortDir] = useState<MobileMarketSortDir>(DEFAULT_SORT_DIR)

  const assetsOptions = useMemo(
    () =>
      Array.from(new Set(markets.map((m) => m.underlyingToken.symbol)))
        .sort()
        .map((symbol) => ({ id: symbol, name: symbol })),
    [markets],
  )

  const activeAssets = useMemo(
    () =>
      assets.filter((asset) =>
        assetsOptions.some((option) => option.id === asset.id),
      ),
    [assets, assetsOptions],
  )

  const sheetFiltered = useMemo(
    () =>
      filterMarkets(markets, {
        assets: activeAssets,
        withdrawalCycles,
        terms,
      }),
    [markets, activeAssets, withdrawalCycles, terms],
  )

  const statusTabs = useMemo(
    () => [
      {
        id: "all",
        label: t("common.filters.all"),
        amount: sheetFiltered.length,
      },
      ...STATUS_TABS.map((tab) => ({
        id: tab.status,
        label: t(tab.labelKey),
        amount: filterMarkets(sheetFiltered, { statuses: byStatus(tab.status) })
          .length,
      })),
    ],
    [sheetFiltered, t],
  )

  const filteredMarkets = useMemo(
    () =>
      status === "all"
        ? sheetFiltered
        : filterMarkets(sheetFiltered, { statuses: byStatus(status) }),
    [sheetFiltered, status],
  )

  const resetKey = [
    status,
    sortField,
    sortDir,
    ...[activeAssets, withdrawalCycles, terms].map((selection) =>
      selection
        .map((item) => item.id)
        .sort()
        .join(","),
    ),
  ].join("|")

  const filterButtonProps: MobileFilterButtonProps = {
    assetsOptions,
    withdrawalCycleOptions: WITHDRAWAL_CYCLE_FILTER_OPTIONS,
    marketAssets: activeAssets,
    setMarketAssets: setAssets,
    marketWithdrawalCycles: withdrawalCycles,
    setMarketWithdrawalCycles: setWithdrawalCycles,
    terms: {
      options: [
        {
          id: HooksKind.OpenTerm,
          name: t("marketParameters.marketTypeChip.OpenTerm"),
        },
        {
          id: HooksKind.PeriodicTerm,
          name: t("marketParameters.marketTypeChip.PeriodicTerm"),
        },
        {
          id: HooksKind.FixedTerm,
          name: t("marketParameters.marketTypeChip.FixedTerm"),
        },
      ],
      selected: terms,
      setSelected: setTerms,
    },
    sort: {
      fields: [
        { id: "debt", name: t("common.fields.totalDebt") },
        { id: "apr", name: t("common.fields.baseApr") },
        { id: "capacity", name: t("common.fields.capacityLeft") },
        { id: "withdrawal", name: t("common.placeholders.withdrawalCycle") },
        { id: "name", name: t("common.fields.name") },
      ],
      field: sortField,
      setField: (field) => {
        if (isSortField(field)) setSortField(field)
      },
      direction: sortDir,
      setDirection: setSortDir,
      defaultField: DEFAULT_SORT_FIELD,
      defaultDirection: DEFAULT_SORT_DIR,
    },
  }

  return {
    filterButtonProps,
    filteredMarkets,
    sort: { field: sortField, dir: sortDir },
    resetKey,
    statusTabs,
    statusTabsLabel: t("common.fields.status"),
    status,
    selectStatus: (id: string) => {
      if (isStatusTab(id)) setStatus(id)
    },
  }
}
