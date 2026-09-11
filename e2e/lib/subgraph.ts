import { gql } from "./env"

/** Typed fork-subgraph reads for the flows under test (Wildcat subgraph v2.5 schema). */
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

export const lenderWithdrawalStatus = async (
  marketId: string,
  expiry: number,
  account: string,
) =>
  (
    await gql<{
      lenderWithdrawalStatus: LenderWithdrawalStatusRow
    }>(`{ lenderWithdrawalStatus(id: "WDSTAT-${marketId.toLowerCase()}-${expiry}-${account.toLowerCase()}") {
      id batchExpiry scaledAmount normalizedAmountWithdrawn totalNormalizedRequests requestsCount executionsCount isCompleted } }`)
  ).lenderWithdrawalStatus

/** Expiries of this lender's incomplete withdrawal batches on a market (oldest first). */
export const openWithdrawalExpiries = async (
  marketId: string,
  account: string,
) =>
  (
    await gql<{ lenderWithdrawalStatuses: { batchExpiry: string }[] }>(
      `{ lenderWithdrawalStatuses(where: { account_: { address: "${account.toLowerCase()}", market: "${marketId.toLowerCase()}" }, isCompleted: false }, orderBy: batchExpiry, first: 20) { batchExpiry } }`,
    )
  ).lenderWithdrawalStatuses.map((s) => Number(s.batchExpiry))
