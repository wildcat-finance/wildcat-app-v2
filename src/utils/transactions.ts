import {
  PartialTransaction,
  SafeTransactionInput,
  TransactionHashLike,
  toTransactionHashString,
  toSafeTransactionInput,
} from "@wildcatfi/wildcat-sdk"
import type {
  Abi,
  Address,
  Hex,
  PublicClient,
  TransactionReceipt,
  WalletClient,
} from "viem"

import { describeContractError } from "@/utils/contractErrors"

export const toSafeTransactions = (
  txs: PartialTransaction[],
): SafeTransactionInput[] => txs.map(toSafeTransactionInput)

export const toSdkTransactionRequest = (tx: PartialTransaction) => ({
  to: tx.to,
  data: tx.data,
  value: (tx.value ?? BigInt(0)).toString(),
})

export const toViemTransactionRequest = (tx: PartialTransaction) => ({
  to: tx.to as Address,
  data: tx.data as Hex,
  value: BigInt(tx.value ?? 0),
})

const GAS_LIMIT_BUFFER_PERCENT = BigInt(25)

export const getBufferedGasLimit = (estimatedGas: bigint): bigint =>
  (estimatedGas * (BigInt(100) + GAS_LIMIT_BUFFER_PERCENT)) / BigInt(100)

const isRevertedReceiptStatus = (status: unknown): boolean =>
  status === "reverted" ||
  status === false ||
  status === 0 ||
  status === BigInt(0) ||
  status === "0x0"

const isSuccessfulReceiptStatus = (status: unknown): boolean =>
  status === "success" ||
  status === true ||
  status === 1 ||
  status === BigInt(1) ||
  status === "0x1"

export const assertTransactionSucceeded = <T>(
  receipt: T,
  transactionHash?: string,
): T => {
  const status =
    typeof receipt === "object" && receipt !== null && "status" in receipt
      ? receipt.status
      : undefined
  if (isSuccessfulReceiptStatus(status)) {
    return receipt
  }
  if (isRevertedReceiptStatus(status)) {
    throw Error(
      transactionHash
        ? `Transaction reverted: ${transactionHash}`
        : "Transaction reverted",
    )
  }
  throw Error(
    transactionHash
      ? `Transaction success could not be confirmed: ${transactionHash}`
      : "Transaction success could not be confirmed",
  )
}

export const sendTransactionAndWait = async (
  publicClient: PublicClient,
  walletClient: WalletClient,
  tx: PartialTransaction,
  options?: { errorAbi?: Abi },
) => {
  const { account } = walletClient
  const { chain } = walletClient
  if (!account || !chain) {
    throw Error("Wallet client is not connected to a chain account")
  }

  const request = toViemTransactionRequest(tx)
  try {
    const estimated = await publicClient.estimateGas({ account, ...request })
    const gas = getBufferedGasLimit(estimated)
    const hash = await walletClient.sendTransaction({
      account,
      chain,
      ...request,
      gas,
    })
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    return assertTransactionSucceeded(receipt, hash)
  } catch (error) {
    throw Error(describeContractError(error, options?.errorAbi))
  }
}

export type SafeTransactionDetails = {
  txStatus?:
    | "AWAITING_CONFIRMATIONS"
    | "AWAITING_EXECUTION"
    | "CANCELLED"
    | "FAILED"
    | "SUCCESS"
  txHash?: string | null
}

type SafeSdkLike = {
  txs: {
    getBySafeTxHash: (
      safeTxHash: string,
    ) => Promise<SafeTransactionDetails | null | undefined>
  }
}

type WaitForTransactionProvider = {
  waitForTransaction: (transactionHash: string) => Promise<TransactionReceipt>
}

type TransactionReceiptRequestProvider = {
  request: (args: {
    method: "eth_getTransactionReceipt"
    params: [string]
  }) => Promise<unknown>
}

const isWaitForTransactionProvider = (
  provider: unknown,
): provider is WaitForTransactionProvider =>
  typeof provider === "object" &&
  provider !== null &&
  "waitForTransaction" in provider &&
  typeof provider.waitForTransaction === "function"

const isTransactionReceiptRequestProvider = (
  provider: unknown,
): provider is TransactionReceiptRequestProvider =>
  typeof provider === "object" &&
  provider !== null &&
  "request" in provider &&
  typeof provider.request === "function"

const delay = (ms: number): Promise<void> =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, Math.max(1, ms))
  })

export type SafeTransactionResolution =
  | { status: "pending" }
  | { status: "executed"; transactionHash: string }
  | {
      status: "terminal"
      transactionStatus: "CANCELLED" | "FAILED"
      transactionHash?: string
    }

export const getSafeTransactionResolution = (
  transaction: SafeTransactionDetails | null | undefined,
): SafeTransactionResolution => {
  if (
    transaction?.txStatus === "CANCELLED" ||
    transaction?.txStatus === "FAILED"
  ) {
    return {
      status: "terminal",
      transactionStatus: transaction.txStatus,
      transactionHash: transaction.txHash ?? undefined,
    }
  }
  if (transaction?.txHash) {
    return { status: "executed", transactionHash: transaction.txHash }
  }
  return { status: "pending" }
}

export class SafeTransactionTerminalError extends Error {
  constructor(
    readonly safeTxHash: string,
    readonly transactionStatus: "CANCELLED" | "FAILED",
    readonly transactionHash?: string,
  ) {
    super(`Safe transaction ${transactionStatus.toLowerCase()}`)
    this.name = "SafeTransactionTerminalError"
  }
}

const SAFE_EXECUTION_POLL_INTERVAL_MS = 1000
const SAFE_EXECUTION_SLOW_POLL_INTERVAL_MS = 5000
const SAFE_EXECUTION_FAST_POLL_WINDOW_MS = 60_000
const SAFE_EXECUTION_SERVICE_FAILURE_GRACE_MS = 120_000
const SAFE_EXECUTION_TIMEOUT_MS = 1_800_000
const SAFE_OUTCOME_GRACE_MS = 15_000

const createSafeExecutionTimeoutError = (
  safeTxHash: string,
  timeoutMs: number,
) => {
  const error = Error(
    `Safe transaction ${safeTxHash} has not executed after` +
      ` ${Math.round(timeoutMs / 1000)}s. The proposal is still queued in the` +
      ` Safe and will execute once the remaining owners have signed it.`,
  )
  error.name = "SafeExecutionTimeoutError"
  return error
}

export type SafeTransactionExecutionOptions = {
  /** Poll cadence for the first `fastPollWindowMs`. */
  pollIntervalMs?: number
  /** Cadence after that. Defaults to `pollIntervalMs`, i.e. no backoff at all. */
  slowPollIntervalMs?: number
  fastPollWindowMs?: number
  /**
   * Wall clock measured from the first of a run of transport failures. The
   * default of 0 rejects on the very first one, which is the existing contract
   * `useDeployV2Market` and `useCreateWrapper` resume flows are written against.
   * The original error is always rethrown unchanged, so no caller has to learn
   * a new error class to keep working.
   */
  serviceFailureGraceMs?: number
  /**
   * Wall clock from the first poll. `undefined` waits indefinitely, which is the
   * existing contract for callers that own their own resume UI.
   */
  timeoutMs?: number
  onWaiting?: (elapsedMs: number) => void
}

/**
 * The one Safe execution poller. It is terminal-aware, so a CANCELLED or FAILED
 * proposal rejects instead of being waited on forever.
 */
export const waitForSafeTransactionExecution = async (
  sdk: SafeSdkLike,
  safeTxHash: string,
  {
    pollIntervalMs = SAFE_EXECUTION_POLL_INTERVAL_MS,
    slowPollIntervalMs = pollIntervalMs,
    fastPollWindowMs = Number.POSITIVE_INFINITY,
    serviceFailureGraceMs = 0,
    timeoutMs,
    onWaiting,
  }: SafeTransactionExecutionOptions = {},
): Promise<string> => {
  const startedAt = Date.now()
  let firstFailureAt: number | undefined

  /* eslint-disable no-await-in-loop */
  for (;;) {
    try {
      const resolution = getSafeTransactionResolution(
        await sdk.txs.getBySafeTxHash(safeTxHash),
      )
      firstFailureAt = undefined
      if (resolution.status === "executed") {
        return resolution.transactionHash
      }
      if (resolution.status === "terminal") {
        throw new SafeTransactionTerminalError(
          safeTxHash,
          resolution.transactionStatus,
          resolution.transactionHash,
        )
      }
    } catch (error) {
      if (error instanceof SafeTransactionTerminalError) throw error
      if (firstFailureAt === undefined) firstFailureAt = Date.now()
      if (Date.now() - firstFailureAt >= serviceFailureGraceMs) throw error
    }

    const elapsedMs = Date.now() - startedAt
    if (timeoutMs !== undefined && elapsedMs >= timeoutMs) {
      throw createSafeExecutionTimeoutError(safeTxHash, timeoutMs)
    }
    onWaiting?.(elapsedMs)
    await delay(
      elapsedMs < fastPollWindowMs ? pollIntervalMs : slowPollIntervalMs,
    )
  }
  /* eslint-enable no-await-in-loop */
}

const APPROVAL_CONFIRMATION_POLL_INTERVAL_MS = 1000
const APPROVAL_CONFIRMATION_TIMEOUT_MS = 300_000
const APPROVAL_ALLOWANCE_POLL_FACTOR = 4
const APPROVAL_ALLOWANCE_GRACE_MS = 15_000
const APPROVAL_RECEIPT_FAILURE_GRACE_MS = 60_000
const APPROVAL_ALLOWANCE_REPORT_ATTEMPTS = 3

const createApprovalConfirmationTimeoutError = (
  transactionHash: string,
  cause?: unknown,
) => {
  const error = Error(`Approval confirmation timed out: ${transactionHash}`)
  error.name = "ApprovalConfirmationTimeoutError"
  if (cause !== undefined) {
    error.cause = cause
  }
  return error
}

export const isApprovalAllowanceSufficient = (
  allowance: bigint,
  requiredAllowance: bigint,
): boolean =>
  requiredAllowance === BigInt(0)
    ? allowance === BigInt(0)
    : allowance >= requiredAllowance

type AllowanceWatcher = {
  poll: () => Promise<boolean>
  lastError: () => unknown
}

const createAllowanceWatcher = (
  isAllowanceSufficient: () => Promise<boolean>,
  graceMs: number,
): AllowanceWatcher => {
  let baseline: boolean | undefined
  let sufficientSince: number | undefined
  let lastError: unknown

  return {
    poll: async () => {
      let current: boolean
      try {
        current = await isAllowanceSufficient()
        lastError = undefined
      } catch (error) {
        lastError = error
        return false
      }

      if (baseline === undefined) {
        baseline = current
        return false
      }
      if (baseline || !current) {
        sufficientSince = undefined
        return false
      }
      if (sufficientSince === undefined) {
        sufficientSince = Date.now()
      }
      return Date.now() - sufficientSince >= graceMs
    },
    lastError: () => lastError,
  }
}

const readAllowanceAfterConfirmation = async (
  isAllowanceSufficient: () => Promise<boolean>,
  attempts: number,
  intervalMs: number,
): Promise<boolean | undefined> => {
  let observed: boolean | undefined

  /* eslint-disable no-await-in-loop */
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) {
      await delay(intervalMs)
    }
    try {
      observed = await isAllowanceSufficient()
      if (observed) return true
    } catch {
      // Leaves the result unknown rather than claiming the allowance is short.
    }
  }
  /* eslint-enable no-await-in-loop */

  return observed
}

type ApprovalEvidence = {
  confirmedBy: "receipt" | "allowance"
  receipt?: unknown
}

const confirmApprovalTransaction = async ({
  provider,
  transactionHash,
  allowance,
  pollingIntervalMs,
  allowancePollIntervalMs,
  timeoutMs,
}: {
  provider: TransactionReceiptRequestProvider
  transactionHash: string
  allowance: AllowanceWatcher
  pollingIntervalMs: number
  allowancePollIntervalMs: number
  timeoutMs: number
}): Promise<ApprovalEvidence> => {
  let stopped = false
  let timeout: ReturnType<typeof setTimeout> | undefined
  let firstFailureAt: number | undefined
  let lastReceiptError: unknown
  let nextAllowancePollAt = Date.now()

  const poll = async (): Promise<ApprovalEvidence> => {
    /* eslint-disable no-await-in-loop */
    for (;;) {
      if (stopped) {
        throw createApprovalConfirmationTimeoutError(transactionHash)
      }

      let receipt: unknown
      try {
        receipt = await provider.request({
          method: "eth_getTransactionReceipt",
          params: [transactionHash],
        })
        firstFailureAt = undefined
        lastReceiptError = undefined
      } catch (error) {
        lastReceiptError = error
        if (firstFailureAt === undefined) firstFailureAt = Date.now()
        if (Date.now() - firstFailureAt >= APPROVAL_RECEIPT_FAILURE_GRACE_MS) {
          throw error
        }
      }

      if (receipt) {
        assertTransactionSucceeded(receipt, transactionHash)
        return { confirmedBy: "receipt", receipt }
      }

      if (Date.now() >= nextAllowancePollAt) {
        nextAllowancePollAt = Date.now() + allowancePollIntervalMs
        if (await allowance.poll()) {
          return { confirmedBy: "allowance" }
        }
      }

      await delay(pollingIntervalMs)
    }
    /* eslint-enable no-await-in-loop */
  }

  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(
      () => {
        reject(
          createApprovalConfirmationTimeoutError(
            transactionHash,
            lastReceiptError ?? allowance.lastError(),
          ),
        )
      },
      Math.max(0, timeoutMs),
    )
  })

  try {
    return await Promise.race([poll(), deadline])
  } finally {
    stopped = true
    if (timeout) clearTimeout(timeout)
  }
}

const confirmSafeExecutionOutcome = async ({
  safeSdk,
  safeTxHash,
  transactionHash,
  pollIntervalMs,
  graceMs,
}: {
  safeSdk: SafeSdkLike
  safeTxHash: string
  transactionHash: string
  pollIntervalMs: number
  graceMs: number
}): Promise<void> => {
  const deadlineAt = Date.now() + Math.max(0, graceMs)

  /* eslint-disable no-await-in-loop */
  for (;;) {
    try {
      const transaction = await safeSdk.txs.getBySafeTxHash(safeTxHash)
      const resolution = getSafeTransactionResolution(transaction)
      if (resolution.status === "terminal") {
        throw new SafeTransactionTerminalError(
          safeTxHash,
          resolution.transactionStatus,
          resolution.transactionHash ?? transactionHash,
        )
      }
      if (transaction?.txStatus === "SUCCESS") {
        return
      }
    } catch (error) {
      if (error instanceof SafeTransactionTerminalError) throw error
    }

    if (Date.now() >= deadlineAt) {
      return
    }
    await delay(pollIntervalMs)
  }
  /* eslint-enable no-await-in-loop */
}

export type ApprovalConfirmation = {
  transactionHash: string
  confirmedBy: "receipt" | "allowance"
  receipt?: unknown
  allowanceSatisfied?: boolean
}

export const waitForApproval = async ({
  provider,
  hash,
  isAllowanceSufficient,
  safeConnected = false,
  safeSdk,
  onTransactionHash,
  onWaitingForSafeExecution,
  pollingIntervalMs = APPROVAL_CONFIRMATION_POLL_INTERVAL_MS,
  timeoutMs = APPROVAL_CONFIRMATION_TIMEOUT_MS,
  safeExecutionTimeoutMs = SAFE_EXECUTION_TIMEOUT_MS,
  safeOutcomeGraceMs = SAFE_OUTCOME_GRACE_MS,
  allowanceGraceMs = APPROVAL_ALLOWANCE_GRACE_MS,
}: {
  provider: unknown
  hash: TransactionHashLike
  isAllowanceSufficient: () => Promise<boolean>
  safeConnected?: boolean
  safeSdk?: SafeSdkLike
  onTransactionHash?: (hash: string) => void
  onWaitingForSafeExecution?: (elapsedMs: number) => void
  pollingIntervalMs?: number
  timeoutMs?: number
  safeExecutionTimeoutMs?: number
  safeOutcomeGraceMs?: number
  allowanceGraceMs?: number
}): Promise<ApprovalConfirmation> => {
  if (safeConnected && !safeSdk) {
    throw Error("No Safe SDK")
  }
  if (!isTransactionReceiptRequestProvider(provider)) {
    throw Error("No provider available to confirm the approval transaction")
  }

  const submittedHash = toTransactionHashString(hash)

  let transactionHash: string
  if (safeConnected && safeSdk) {
    try {
      transactionHash = await waitForSafeTransactionExecution(
        safeSdk,
        submittedHash,
        {
          pollIntervalMs: pollingIntervalMs,
          slowPollIntervalMs: Math.max(
            pollingIntervalMs,
            SAFE_EXECUTION_SLOW_POLL_INTERVAL_MS,
          ),
          fastPollWindowMs: SAFE_EXECUTION_FAST_POLL_WINDOW_MS,
          serviceFailureGraceMs: SAFE_EXECUTION_SERVICE_FAILURE_GRACE_MS,
          timeoutMs: safeExecutionTimeoutMs,
          onWaiting: onWaitingForSafeExecution,
        },
      )
    } catch (error) {
      // A proposal that failed on-chain still produced a transaction the user
      // can open in an explorer, so hand the hash over before rejecting.
      if (
        error instanceof SafeTransactionTerminalError &&
        error.transactionHash
      ) {
        onTransactionHash?.(error.transactionHash)
      }
      throw error
    }
  } else {
    transactionHash = submittedHash
  }

  onTransactionHash?.(transactionHash)

  const allowance = createAllowanceWatcher(
    isAllowanceSufficient,
    allowanceGraceMs,
  )
  const evidence = await confirmApprovalTransaction({
    provider,
    transactionHash,
    allowance,
    pollingIntervalMs,
    allowancePollIntervalMs: pollingIntervalMs * APPROVAL_ALLOWANCE_POLL_FACTOR,
    timeoutMs,
  })

  if (safeConnected && safeSdk && evidence.confirmedBy === "receipt") {
    await confirmSafeExecutionOutcome({
      safeSdk,
      safeTxHash: submittedHash,
      transactionHash,
      pollIntervalMs: pollingIntervalMs,
      graceMs: safeOutcomeGraceMs,
    })
  }

  const allowanceSatisfied =
    evidence.confirmedBy === "allowance"
      ? true
      : await readAllowanceAfterConfirmation(
          isAllowanceSufficient,
          APPROVAL_ALLOWANCE_REPORT_ATTEMPTS,
          pollingIntervalMs,
        )

  return { transactionHash, ...evidence, allowanceSatisfied }
}

export const waitForSubmittedTransaction = async ({
  provider,
  hash,
  safeConnected,
  safeSdk,
}: {
  provider: unknown
  hash: TransactionHashLike
  safeConnected?: boolean
  safeSdk?: SafeSdkLike
}): Promise<{ hash: string; receipt: TransactionReceipt }> => {
  if (!isWaitForTransactionProvider(provider)) {
    throw Error("No provider available to wait for transaction")
  }
  if (safeConnected && !safeSdk) {
    throw Error("No Safe SDK")
  }
  const submittedHash = toTransactionHashString(hash)
  const transactionHash =
    safeConnected && safeSdk
      ? await waitForSafeTransactionExecution(safeSdk, submittedHash)
      : submittedHash
  const receipt = await provider.waitForTransaction(transactionHash)
  return {
    hash: transactionHash,
    receipt: assertTransactionSucceeded(receipt, transactionHash),
  }
}
