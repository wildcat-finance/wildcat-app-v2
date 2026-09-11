import { gql } from "./env"

/** Typed fork-subgraph reads for the flows under test. */
export type Asset = {
  address: string
  decimals: number
  symbol: string
  isMock: boolean
}
export type MarketRow = {
  id: string
  name: string
  totalDeposited: string
  withdrawalBatchDuration: number
  isClosed: boolean
  asset: Asset
  hooksConfig: { minimumDeposit: string | null } | null
}
export type LenderAccountRow = {
  totalDeposited: string
  scaledBalance: string
  deposits: { id: string }[]
} | null
export type BatchRow = {
  id: string
  expiry: string
  isExpired: boolean
  isClosed: boolean
  isCompleted: boolean
  totalNormalizedRequests: string
  normalizedAmountPaid: string
  normalizedAmountClaimed: string
  scaledTotalAmount: string
  lenderWithdrawalsCount: number
  completedWithdrawalsCount: number
}
export type LenderWithdrawalStatusRow = {
  id: string
  /** Normalised by the reader below: v2.1.8 serves it as `batch { expiry }`. */
  batchExpiry: string
  scaledAmount: string
  normalizedAmountWithdrawn: string
  totalNormalizedRequests: string
  requestsCount: number
  executionsCount: number
  isCompleted: boolean
} | null

export const market = async (id: string) =>
  (
    await gql<{
      market: MarketRow | null
    }>(`{ market(id: "${id.toLowerCase()}") {
      id name totalDeposited withdrawalBatchDuration isClosed asset { address decimals symbol isMock } hooksConfig { minimumDeposit } } }`)
  ).market

export const lenderAccount = async (marketId: string, account: string) =>
  (
    await gql<{
      lenderAccount: LenderAccountRow
    }>(`{ lenderAccount(id: "LENDER-${marketId.toLowerCase()}-${account.toLowerCase()}") {
      totalDeposited scaledBalance deposits(first: 100) { id } } }`)
  ).lenderAccount

export const withdrawalBatch = async (marketId: string, expiry: number) =>
  (
    await gql<{
      withdrawalBatch: BatchRow | null
    }>(`{ withdrawalBatch(id: "WDBATCH-${marketId.toLowerCase()}-${expiry}") {
      id expiry isExpired isClosed isCompleted totalNormalizedRequests normalizedAmountPaid normalizedAmountClaimed scaledTotalAmount
      lenderWithdrawalsCount completedWithdrawalsCount } }`)
  ).withdrawalBatch

/** v2.1.8 exposes a status row's expiry only through its batch edge. */
const readBatchExpiry = (row: { batch?: { expiry: string } | null }) =>
  Number(row.batch?.expiry ?? 0)

export const lenderWithdrawalStatus = async (
  marketId: string,
  expiry: number,
  account: string,
): Promise<LenderWithdrawalStatusRow> => {
  const { lenderWithdrawalStatus: row } = await gql<{
    lenderWithdrawalStatus:
      | (Omit<NonNullable<LenderWithdrawalStatusRow>, "batchExpiry"> & {
          batch?: { expiry: string } | null
        })
      | null
  }>(`{ lenderWithdrawalStatus(id: "WDSTAT-${marketId.toLowerCase()}-${expiry}-${account.toLowerCase()}") {
      id batch { expiry } scaledAmount normalizedAmountWithdrawn totalNormalizedRequests requestsCount executionsCount isCompleted } }`)
  return row ? { ...row, batchExpiry: String(readBatchExpiry(row)) } : null
}

/** Expiries of this lender's incomplete withdrawal batches on a market (oldest first). */
export const openWithdrawalExpiries = async (
  marketId: string,
  account: string,
) =>
  (
    await gql<{
      lenderWithdrawalStatuses: {
        batch?: { expiry: string } | null
      }[]
    }>(
      `{ lenderWithdrawalStatuses(where: { account_: { address: "${account.toLowerCase()}", market: "${marketId.toLowerCase()}" }, isCompleted: false }, orderBy: batch__expiry, first: 20) { batch { expiry } } }`,
    )
  ).lenderWithdrawalStatuses.map(readBatchExpiry)
