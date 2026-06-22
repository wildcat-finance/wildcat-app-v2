"use client"

import * as React from "react"

import { Box, Divider, SvgIcon, Typography } from "@mui/material"
import { GridRowsProp } from "@mui/x-data-grid"

import {
  getBorrowerDisplayName,
  useBorrowerNames,
} from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import { ProfileHealthChipsRowSx } from "@/app/[locale]/lender/profile/components/LenderProfileOverviewTab/ProfileHealthTable/style"
import { LenderPositionsData } from "@/app/[locale]/lender/profile/hooks/types"
import { useLenderActivity } from "@/app/[locale]/lender/profile/hooks/useLenderActivity"
import { useLenderBatches } from "@/app/[locale]/lender/profile/hooks/useLenderBatches"
import BatchIcon from "@/assets/icons/chipEmptyGrey_icon.svg"
import { FilterTextField } from "@/components/FilterTextfield"
import { MarketsFilterSelect } from "@/components/MarketsFilterSelect"
import { MarketsFilterSelectItem } from "@/components/MarketsFilterSelect/interface"
import { formatUsd } from "@/components/Profile/shared/analytics"
import { COLORS } from "@/theme/colors"

import { BatchesTable } from "./BatchesTable"
import { BatchTableRow, getBatchStatusLabel } from "./BatchesTable/interface"
import {
  TIME_RANGE_OPTIONS,
  TimeRangeId,
  TimeRangeSelect,
} from "./TimeRangeSelect"
import { TransactionsTable } from "./TransactionsTable"
import { TransactionTableRow } from "./TransactionsTable/interface"

type BatchesAndTransactionsSectionProps = {
  lenderAddress?: `0x${string}`
  lenderData?: LenderPositionsData
}

type ActivityMode = "batches" | "transactions"

const MODES: { key: ActivityMode; label: string }[] = [
  { key: "batches", label: "Withdrawal Batches" },
  { key: "transactions", label: "All transactions" },
]

// Status-filter options: batch statuses vs transaction types.
const BATCH_STATUS_OPTIONS: MarketsFilterSelectItem[] = [
  { id: "Completed", name: "Completed" },
  { id: "Pending", name: "Pending" },
  { id: "Expired", name: "Expired" },
  { id: "Closed", name: "Closed" },
]

const TX_TYPE_OPTIONS: MarketsFilterSelectItem[] = [
  { id: "Deposit", name: "Deposit" },
  { id: "Withdrawal Request", name: "Withdrawal Request" },
  { id: "Withdrawal Execution", name: "Withdrawal Execution" },
]

export const toggleChipSx = (selected: boolean, isBatches: boolean) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: isBatches ? "6px 14px 6px 10px" : "6px 14px",
  borderRadius: "24px",
  cursor: "pointer",
  appearance: "none",
  backgroundColor: "transparent",
  border: `1px solid ${selected ? COLORS.manate : COLORS.whiteLilac}`,
  transition: "border-color 0.2s ease",
  "&:hover": {
    borderColor: COLORS.manate,
  },
})

const ActivityModeToggle = ({
  mode,
  onChange,
  counts,
}: {
  mode: ActivityMode
  onChange: (mode: ActivityMode) => void
  counts: Record<ActivityMode, number>
}) => (
  <Box sx={ProfileHealthChipsRowSx}>
    {MODES.map((item) => (
      <Box
        key={item.key}
        component="button"
        type="button"
        onClick={() => onChange(item.key)}
        sx={toggleChipSx(mode === item.key, item.key === "batches")}
      >
        {item.key === "batches" && (
          <SvgIcon component={BatchIcon} sx={{ fontSize: "16px" }} />
        )}

        <Typography variant="text4Highlighted">{item.label}</Typography>

        <Typography variant="text4" color={COLORS.manate}>
          {counts[item.key]}
        </Typography>
      </Box>
    ))}
  </Box>
)

type OverviewItem = { title: string; subtitle?: string; value: string }

// Bordered card split into equal sections by vertical dividers; each section is
// a title (+ optional subtitle) with a bottom-anchored value.
const OverviewBanner = ({ items }: { items: OverviewItem[] }) => (
  <Box
    sx={{
      width: "100%",
      display: "flex",
      borderRadius: "12px",
      padding: "14px 2px",
      border: `1px solid ${COLORS.iron}`,
      backgroundColor: "transparent",
      overflow: "hidden",
    }}
  >
    {items.map((item, index) => (
      <React.Fragment key={item.title}>
        {index > 0 && (
          <Divider
            orientation="vertical"
            sx={{ borderColor: COLORS.iron, height: "100%" }}
          />
        )}

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "3px",
            paddingX: "14px",
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <Typography variant="text3">{item.title}</Typography>

            {item.subtitle && (
              <Typography variant="text3" color={COLORS.manate}>
                {item.subtitle}
              </Typography>
            )}
          </Box>

          <Typography variant="title3">{item.value}</Typography>
        </Box>
      </React.Fragment>
    ))}
  </Box>
)

const ExpiredBatchesAlert = ({ count }: { count: number }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "12px",
      border: `1px solid ${COLORS.cherub}`,
      borderRadius: "8px",
      backgroundColor: COLORS.remy,
    }}
  >
    <Box
      component="span"
      sx={{
        flexShrink: 0,
        width: "16px",
        height: "16px",
        borderRadius: "50%",
        backgroundColor: COLORS.carminePink,
        color: COLORS.white,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "11px",
        fontWeight: 600,
      }}
    >
      !
    </Box>

    <Typography variant="text3" color={COLORS.dullRed}>
      {count} withdrawal {count === 1 ? "batch has" : "batches have"} expired.
      Affected requests must be re-submitted to withdraw the funds.
    </Typography>
  </Box>
)

export const BatchesAndTransactionsSection = ({
  lenderAddress,
  lenderData,
}: BatchesAndTransactionsSectionProps) => {
  const [mode, setMode] = React.useState<ActivityMode>("batches")
  const [search, setSearch] = React.useState("")
  const [batchStatusFilter, setBatchStatusFilter] = React.useState<
    MarketsFilterSelectItem[]
  >([])
  const [txTypeFilter, setTxTypeFilter] = React.useState<
    MarketsFilterSelectItem[]
  >([])
  const [txAssetFilter, setTxAssetFilter] = React.useState<
    MarketsFilterSelectItem[]
  >([])
  const [timeRange, setTimeRange] = React.useState<TimeRangeId>("all")
  const { data: borrowers } = useBorrowerNames()

  const batchesQuery = useLenderBatches(
    lenderAddress,
    lenderData?.marketIds ?? [],
    lenderData?.priceMap ?? {},
  )
  const activityQuery = useLenderActivity(
    lenderAddress,
    lenderData?.marketIds ?? [],
    lenderData?.decimalsMap ?? {},
    lenderData?.priceMap ?? {},
  )

  // Markets the lender holds carry the borrower; batches/activity only carry a
  // market id, so look the borrower up from the positions.
  const borrowerByMarket = React.useMemo(() => {
    const map = new Map<string, string>()
    ;(lenderData?.positions ?? []).forEach((position) =>
      map.set(position.marketId, position.borrower),
    )
    return map
  }, [lenderData?.positions])

  // Current balance the lender holds in each market's protocol.
  const balanceByMarket = React.useMemo(() => {
    const map = new Map<string, number>()
    ;(lenderData?.positions ?? []).forEach((position) =>
      map.set(position.marketId, position.currentBalance),
    )
    return map
  }, [lenderData?.positions])

  // Asset (token symbol) per market, for the transactions asset filter.
  const assetByMarket = React.useMemo(() => {
    const map = new Map<string, string>()
    ;(lenderData?.positions ?? []).forEach((position) =>
      map.set(position.marketId, position.asset),
    )
    return map
  }, [lenderData?.positions])

  const assetOptions = React.useMemo<MarketsFilterSelectItem[]>(() => {
    const assets = new Set<string>()
    ;(lenderData?.positions ?? []).forEach((position) => {
      if (position.asset) assets.add(position.asset)
    })
    return Array.from(assets)
      .sort()
      .map((asset) => ({ id: asset, name: asset }))
  }, [lenderData?.positions])

  const resolveBorrower = React.useCallback(
    (marketId: string) => {
      const borrower = borrowerByMarket.get(marketId) ?? ""
      return {
        borrower,
        borrowerName: borrower
          ? getBorrowerDisplayName(borrower, borrowers ?? [], "name")
          : undefined,
      }
    },
    [borrowerByMarket, borrowers],
  )

  const batchRows = React.useMemo<GridRowsProp<BatchTableRow>>(
    () =>
      (batchesQuery.data ?? []).map((batch) => ({
        id: batch.id,
        marketId: batch.marketId,
        marketName: batch.marketName,
        ...resolveBorrower(batch.marketId),
        expiry: batch.expiry,
        requested: batch.requested,
        withdrawn: batch.withdrawn,
        remaining: batch.remaining,
        status: getBatchStatusLabel(batch),
        createdAt: batch.createdAt,
        txHash: batch.txHash,
      })),
    [batchesQuery.data, resolveBorrower],
  )

  const txRows = React.useMemo<GridRowsProp<TransactionTableRow>>(
    () =>
      (activityQuery.data?.activity ?? []).map((entry) => ({
        id: entry.id,
        date: entry.date,
        timestamp: entry.timestamp,
        market: entry.market,
        marketId: entry.marketId,
        ...resolveBorrower(entry.marketId),
        type: entry.type,
        amountUsd: entry.amountUsd,
        balanceInProtocol: balanceByMarket.get(entry.marketId) ?? 0,
        txHash: entry.txHash,
      })),
    [activityQuery.data, resolveBorrower, balanceByMarket],
  )

  const batchSummary = React.useMemo(() => {
    let completed = 0
    let pending = 0
    let expired = 0
    let totalRequested = 0

    ;(batchesQuery.data ?? []).forEach((batch) => {
      const label = getBatchStatusLabel(batch)
      if (label === "Completed") completed += 1
      else if (label === "Pending") pending += 1
      else if (label === "Expired") expired += 1
      totalRequested += batch.requested
    })

    return { completed, pending, expired, totalRequested }
  }, [batchesQuery.data])

  // Lower bound (unix seconds) for the selected time range; null = all time.
  const timeCutoff = React.useMemo(() => {
    const seconds =
      TIME_RANGE_OPTIONS.find((option) => option.id === timeRange)?.seconds ??
      null
    return seconds === null ? null : Math.floor(Date.now() / 1000) - seconds
  }, [timeRange])

  const filteredBatchRows = React.useMemo(() => {
    const statusIds = batchStatusFilter.map((item) => item.id)
    const query = search.trim().toLowerCase()

    return batchRows.filter((row) => {
      const matchesStatus =
        statusIds.length === 0 || statusIds.includes(row.status)
      // Search by market name/address, borrower name/address, or tx hash.
      const matchesSearch =
        query === "" ||
        [
          row.marketName,
          row.marketId,
          row.borrowerName ?? "",
          row.borrower,
          row.txHash,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query)
      const matchesTime = timeCutoff === null || row.createdAt >= timeCutoff
      return matchesStatus && matchesSearch && matchesTime
    })
  }, [batchRows, batchStatusFilter, search, timeCutoff])

  const filteredTxRows = React.useMemo(() => {
    const typeIds = txTypeFilter.map((item) => item.id)
    const assetIds = txAssetFilter.map((item) => item.id)
    const query = search.trim().toLowerCase()

    return txRows.filter((row) => {
      const matchesType = typeIds.length === 0 || typeIds.includes(row.type)
      const matchesAsset =
        assetIds.length === 0 ||
        assetIds.includes(assetByMarket.get(row.marketId) ?? "")
      // Search by market name/address, borrower name/address, or tx hash.
      const matchesSearch =
        query === "" ||
        [
          row.market,
          row.marketId,
          row.borrowerName ?? "",
          row.borrower,
          row.txHash,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query)
      const matchesTime = timeCutoff === null || row.timestamp >= timeCutoff
      return matchesType && matchesAsset && matchesSearch && matchesTime
    })
  }, [txRows, txTypeFilter, txAssetFilter, assetByMarket, search, timeCutoff])

  // The overview banner is batches-only (hidden in transactions mode).
  const bannerItems: OverviewItem[] = [
    {
      title: "Total requested",
      subtitle: "across all markets",
      value: formatUsd(batchSummary.totalRequested, { compact: true }),
    },
    {
      title: "Completed / Pending",
      value: `${batchSummary.completed}/${batchSummary.pending}`,
    },
    { title: "Expired", value: String(batchSummary.expired) },
  ]

  // The Status filter switches between batch statuses and transaction types.
  const statusOptions =
    mode === "batches" ? BATCH_STATUS_OPTIONS : TX_TYPE_OPTIONS
  const statusSelected = mode === "batches" ? batchStatusFilter : txTypeFilter
  const setStatusSelected =
    mode === "batches" ? setBatchStatusFilter : setTxTypeFilter

  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      <ActivityModeToggle
        mode={mode}
        onChange={setMode}
        counts={{ batches: batchRows.length, transactions: txRows.length }}
      />

      {mode === "batches" && (
        <Box sx={{ width: "100%", display: "flex", mb: "12px" }}>
          <OverviewBanner items={bannerItems} />
        </Box>
      )}

      {mode === "batches" && batchSummary.expired > 0 && (
        <Box sx={{ width: "100%", mb: "12px" }}>
          <ExpiredBatchesAlert count={batchSummary.expired} />
        </Box>
      )}

      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          mb: "12px",
        }}
      >
        <Box sx={{ display: "flex", gap: "6px" }}>
          {mode === "transactions" && (
            <MarketsFilterSelect
              placeholder="Asset"
              options={assetOptions}
              selected={txAssetFilter}
              setSelected={setTxAssetFilter}
            />
          )}

          <MarketsFilterSelect
            placeholder={mode === "transactions" ? "Type" : "Status"}
            options={statusOptions}
            selected={statusSelected}
            setSelected={setStatusSelected}
          />

          <TimeRangeSelect value={timeRange} onChange={setTimeRange} />
        </Box>

        <FilterTextField
          value={search}
          setValue={setSearch}
          placeholder="Search"
          width="264px"
        />
      </Box>

      {mode === "batches" ? (
        <BatchesTable rows={filteredBatchRows} />
      ) : (
        <TransactionsTable rows={filteredTxRows} />
      )}
    </Box>
  )
}
