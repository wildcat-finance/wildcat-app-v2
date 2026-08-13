export const EXPORT_CHAIN_IDS = [1, 11155111, 9745, 9746] as const
export const MAX_EXPORT_MARKETS = 50
export const MAX_EXPORT_ADDRESSES = 25
export type ExportChainId = (typeof EXPORT_CHAIN_IDS)[number]

export type ExportStatementType = "market_condition" | "position" | "borrower"
export type ExportStatementFormat = "pdf" | "xlsx"

export type ExportRequest = {
  chainId: ExportChainId
  markets: "all" | string[]
  statements: ExportStatementType[]
  addresses: string[]
  dateFrom?: string
  dateTo?: string
  format: ExportStatementFormat
  snapshotBlock?: string
}

export type CanonicalExportRequest = Omit<ExportRequest, "snapshotBlock"> & {
  snapshotBlock: string
  snapshotBlockHash: string
}

export type JsonRpcLog = {
  address: string
  blockNumber: string
  transactionHash: string
  transactionIndex: string
  blockHash: string
  logIndex: string
  removed: boolean
  data: string
  topics: string[]
}

export type JsonRpcTransaction = {
  hash: string
  blockHash: string
  from: string
  to: string | null
  input: string
  blockNumber: string
  transactionIndex: string
  value: string
}

export type JsonRpcReceipt = {
  transactionHash: string
  blockHash: string
  status: string
  gasUsed: string
  effectiveGasPrice?: string
  blockNumber: string
  transactionIndex: string
  from: string
  to: string | null
  logs: JsonRpcLog[]
}

export type MarketMetadata = {
  chainId: ExportChainId
  address: string
  controller?: string
  removedAtBlock?: number
  version: string
  borrower: string
  feeRecipient: string
  name: string
  symbol: string
  assetAddress: string
  assetName: string
  assetSymbol: string
  assetDecimals: number
  deploymentBlock: number
}

export type DecodedMarketEvent = {
  marketAddress: string
  marketSymbol: string
  timestamp: number
  blockNumber: number
  transactionHash: string
  transactionIndex: number
  logIndex: number
  name: string
  args: Record<string, unknown>
  participant?: string
  counterparty?: string
  tokenAddress?: string
  tokenSymbol?: string
  amountRaw?: bigint
  scaledAmountRaw?: bigint
  expiry?: number
  transactionFrom: string
  transactionTo: string | null
  method: string
  transactionStatus: "success" | "failed"
}

export type TransactionLedgerRow = {
  marketAddress: string
  marketSymbol: string
  timestamp: number
  blockNumber: number
  transactionHash: string
  transactionIndex: number
  transactionFrom: string
  transactionTo: string | null
  method: string
  status: "success" | "failed" | "success_asset_transfer_only"
  assetAddress: string
  assetSymbol: string
  depositedRaw: bigint
  borrowedRaw: bigint
  repaidRaw: bigint
  withdrawalQueuedRaw: bigint
  withdrawalExecutedRaw: bigint
  feesCollectedRaw: bigint
  escrowedOutRaw: bigint
  untrackedAssetInRaw: bigint
  untrackedAssetOutRaw: bigint
  marketTokensTransferredRaw: bigint
  gasUsed: bigint
  gasPriceWei: bigint
  events: string[]
  summary: string
}

export type InterestAccrualRow = {
  marketAddress: string
  marketSymbol: string
  blockNumber: number
  transactionHash: string
  logIndex: number
  periodStart: number
  periodEnd: number
  baseInterestRay: bigint
  delinquencyFeeRay: bigint
  protocolFeesRaw: bigint
  scaleFactorBeforeRay: bigint
  scaleFactorAfterRay: bigint
  baseInterestAssetsRaw: bigint
  penaltyInterestAssetsRaw: bigint
  scaledTotalSupplyRaw: bigint
  isDelinquent: boolean
  annualInterestBips: number
  delinquencyFeeBips: number
  protocolFeeBips: number
}

export type DailySeriesRow = Record<string, string>

export type PositionSummary = {
  address: string
  depositsRaw: bigint
  principalAcquiredByTransferRaw: bigint
  activePrincipalRaw: bigint
  pendingWithdrawalPrincipalRaw: bigint
  principalStillInvestedRaw: bigint
  principalReturnedRaw: bigint
  principalTransferredOutRaw: bigint
  marketTokensTransferredOutRaw: bigint
  currentValueRaw: bigint
  pendingWithdrawalValueRaw: bigint
  totalPositionValueRaw: bigint
  payoutsRaw: bigint
  earningsRaw: bigint
  scaledBalanceRaw: bigint
  annualEarnings: Record<string, bigint>
}

export type DelinquencyEpisode = {
  onsetTimestamp: number
  onsetBlock: number
  onsetTransactionHash: string
  cureTimestamp?: number
  cureBlock?: number
  cureTransactionHash?: string
  penaltyEndTimestamp?: number
  durationSeconds: number
  gracePeriodSeconds: number
  penaltyTriggered: boolean
  penaltyInterestAssetsRaw: bigint
  reserveRatioBips: number
  isOpen: boolean
}

export type MarketDataset = {
  pipelineVersion: string
  snapshotBlock: number
  snapshotBlockHash: string
  snapshotTimestamp: number
  market: MarketMetadata
  events: DecodedMarketEvent[]
  transactions: TransactionLedgerRow[]
  interestAccruals: InterestAccrualRow[]
  dailySeries: DailySeriesRow[]
  positions: Record<string, PositionSummary>
  manifest: {
    reconciliation: {
      expectedAssetBalanceRaw: string
      actualAssetBalanceRaw: string
      differenceRaw: string
      walkedScaledSupplyRaw: string
      onchainScaledSupplyRaw: string
      computedTotalSupplyRaw: string
      onchainTotalSupplyRaw: string
      computedTotalDebtsRaw: string
      onchainTotalDebtsRaw: string
      snapshotScaleFactorRay: string
    }
    excludedTransfers: Record<string, unknown>[]
    delinquencyEpisodes: DelinquencyEpisode[]
    protocolFeesByYearRaw: Record<string, string>
    netLenderFlowRaw: string
    openWithdrawalClaimsRaw: string
    revertedTransactionCoverage: "direct_only"
    rpcProviders: string[]
    crossChecks: {
      etherscanLogCount: number
      rpcLogCount: number
      logSetsEqual: boolean
      marketClosedEventCount: number
      marketClosedBlock?: number
    }
  }
}

export type ExportProgress = {
  status: "queued" | "running" | "completed" | "failed" | "cancelled"
  progress: number
  phase?: string
  error?: string
  downloadUrl?: string
  generatedAtUtc?: string
  request?: CanonicalExportRequest
}
