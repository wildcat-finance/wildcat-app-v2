import {
  GridColDef,
  GridComparatorFn,
  GridSortCellParams,
} from "@mui/x-data-grid"
import { HooksKind } from "@wildcatfi/wildcat-sdk"

import {
  LenderPositionRow,
  LenderPositionsData,
} from "@/app/[locale]/lender/profile/hooks/types"
import { MarketStatus } from "@/utils/marketStatus"

export type ProfileHealthTableProps = {
  lenderAddress?: `0x${string}`
  lenderData?: LenderPositionsData
}

// Mirrors the markets-tables convention (TypeSafeColDef + a typed row model):
// `field` is constrained to keys of the row so columns stay in sync with rows.
export type TypeSafeColDef<T> = GridColDef & { field: keyof T }

// Maps a position lifecycle status to the MarketStatusChip / statusComparator
// shape (same object the markets tables feed into those primitives).
export const getPositionMarketStatus = (
  status: LenderPositionRow["status"],
) => {
  const statusMap = {
    Active: MarketStatus.HEALTHY,
    Delinquent: MarketStatus.DELINQUENT,
    Penalty: MarketStatus.PENALTY,
    Closed: MarketStatus.TERMINATED,
  } as const

  return {
    status: statusMap[status],
    healthyPeriod: null,
    penaltyPeriod: 0,
    delinquencyPeriod: 0,
  }
}

// Term shape accepted by MarketTypeChip (spread as props) and typeComparator.
export type PortfolioHealthTerm =
  | { kind: HooksKind.FixedTerm; fixedPeriod: number }
  | { kind: HooksKind.OpenTerm | HooksKind.Unknown; fixedPeriod?: undefined }

export type PortfolioHealthRow = {
  id: string
  marketId: string
  name: string
  borrower: string
  borrowerName: string | undefined
  status: ReturnType<typeof getPositionMarketStatus>
  term: PortfolioHealthTerm
  asset: string
  balance: number
  deposited: number
  interest: number
  inHandUsd: number
  apr: number
  button: string
}

// Sort order for the "Status and Term" column:
//   healthy → pending → penalty → terminated  (primary, by status severity)
//   open term → fixed term                    (secondary, within each status)
const STATUS_RANK: Record<MarketStatus, number> = {
  [MarketStatus.HEALTHY]: 0,
  [MarketStatus.DELINQUENT]: 1, // displayed as "Pending"
  [MarketStatus.PENALTY]: 2,
  [MarketStatus.TERMINATED]: 3,
}

// Open term ranks before fixed term.
const termRank = (params: GridSortCellParams): number => {
  const row = params.api?.getRow?.(params.id) as PortfolioHealthRow | undefined
  return row?.term.kind === HooksKind.FixedTerm ? 1 : 0
}

const rank = (
  status: PortfolioHealthRow["status"],
  params: GridSortCellParams,
): number => (STATUS_RANK[status.status] ?? 99) * 2 + termRank(params)

export const statusAndTermComparator: GridComparatorFn<
  PortfolioHealthRow["status"]
> = (statusA, statusB, paramsA, paramsB) =>
  rank(statusA, paramsA) - rank(statusB, paramsB)
