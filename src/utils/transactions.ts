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

const WAIT_TIMED_OUT = Symbol("timed out")

const waitUpTo = async <T>(
  work: Promise<T>,
  timeoutMs: number,
): Promise<T | typeof WAIT_TIMED_OUT> => {
  let timeout: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<typeof WAIT_TIMED_OUT>((resolve) => {
    timeout = setTimeout(() => resolve(WAIT_TIMED_OUT), Math.max(0, timeoutMs))
  })

  try {
    return await Promise.race([work, deadline])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

type TimedRead<T> =
  | { status: "value"; value: T }
  | { status: "error"; error: unknown }
  | { status: "timeout" }

const readUpTo = async <T>(
  read: () => Promise<T>,
  timeoutMs: number,
): Promise<TimedRead<T>> => {
  try {
    const result = await waitUpTo(read(), timeoutMs)
    return result === WAIT_TIMED_OUT
      ? { status: "timeout" }
      : { status: "value", value: result }
  } catch (error) {
    return { status: "error", error }
  }
}

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
      ` ${Math.round(timeoutMs / 1000)}s. It may still be queued; check its` +
      ` signature and execution status in Safe.`,
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
    const elapsedMs = Date.now() - startedAt
    if (timeoutMs !== undefined && elapsedMs >= timeoutMs) {
      throw createSafeExecutionTimeoutError(safeTxHash, timeoutMs)
    }

    try {
      const request = sdk.txs.getBySafeTxHash(safeTxHash)
      // checking the clock after the SDK call is useless if the call never
      // comes back. bound the call itself or we've just renamed the hang.
      let transaction: SafeTransactionDetails | null | undefined
      if (timeoutMs === undefined) {
        transaction = await request
      } else {
        const result = await waitUpTo(request, timeoutMs - elapsedMs)
        if (result === WAIT_TIMED_OUT) {
          throw createSafeExecutionTimeoutError(safeTxHash, timeoutMs)
        }
        transaction = result
      }
      const resolution = getSafeTransactionResolution(transaction)
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
      if (
        error instanceof SafeTransactionTerminalError ||
        (error instanceof Error && error.name === "SafeExecutionTimeoutError")
      ) {
        throw error
      }
      if (firstFailureAt === undefined) firstFailureAt = Date.now()
      if (Date.now() - firstFailureAt >= serviceFailureGraceMs) throw error
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
const APPROVAL_ALLOWANCE_GRACE_MS = 15_000
const APPROVAL_ALLOWANCE_RECONCILIATION_MS = 15_000

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

const createApprovalAllowanceMismatchError = (transactionHash: string) => {
  const error = Error(
    `Approval transaction succeeded but allowance is still insufficient:` +
      ` ${transactionHash}`,
  )
  error.name = "ApprovalAllowanceMismatchError"
  return error
}

export const isApprovalAllowanceMismatchError = (error: unknown) =>
  error instanceof Error && error.name === "ApprovalAllowanceMismatchError"

export const isApprovalAllowanceSufficient = (
  allowance: bigint,
  requiredAllowance: bigint,
): boolean =>
  requiredAllowance === BigInt(0)
    ? allowance === BigInt(0)
    : allowance >= requiredAllowance

export type ApprovalConfirmation = {
  transactionHash: string
  confirmedBy: "receipt" | "allowance"
  receipt?: unknown
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
  allowanceReconciliationMs = APPROVAL_ALLOWANCE_RECONCILIATION_MS,
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
  allowanceReconciliationMs?: number
}): Promise<ApprovalConfirmation> => {
  if (safeConnected && !safeSdk) {
    throw Error("No Safe SDK")
  }
  if (!isTransactionReceiptRequestProvider(provider)) {
    throw Error("No provider available to confirm the approval transaction")
  }

  const submittedHash = toTransactionHashString(hash)
  const startedAt = Date.now()
  let transactionHash: string | undefined = safeConnected
    ? undefined
    : submittedHash
  let transactionKnownAt = transactionHash ? startedAt : undefined
  let successfulReceipt: unknown
  let receiptConfirmedAt: number | undefined
  let allowanceReadyAt: number | undefined
  let allowanceObserved: boolean | undefined
  let safeOutcomeConfirmed = !safeConnected
  let safeOutcomeGraceStartedAt: number | undefined
  let firstSafeFailureAt: number | undefined
  let lastSafeError: unknown
  let lastReceiptError: unknown
  let lastAllowanceError: unknown
  // keep each read single-flight. one dead rpc call shouldn't spawn a fresh
  // dead rpc call every second.
  let safeRequest:
    | Promise<SafeTransactionDetails | null | undefined>
    | undefined
  let receiptRequest: Promise<unknown> | undefined
  let allowanceRequest: Promise<boolean> | undefined

  if (transactionHash) onTransactionHash?.(transactionHash)

  const readSafe = () => {
    if (!safeSdk) throw Error("No Safe SDK")
    safeRequest ??= Promise.resolve()
      .then(() => safeSdk.txs.getBySafeTxHash(submittedHash))
      .finally(() => {
        safeRequest = undefined
      })
    return safeRequest
  }
  const readReceipt = () => {
    const hashToRead = transactionHash
    if (!hashToRead) throw Error("No transaction hash")
    receiptRequest ??= Promise.resolve()
      .then(() =>
        provider.request({
          method: "eth_getTransactionReceipt",
          params: [hashToRead],
        }),
      )
      .finally(() => {
        receiptRequest = undefined
      })
    return receiptRequest
  }
  const readAllowance = () => {
    allowanceRequest ??= Promise.resolve()
      .then(isAllowanceSufficient)
      .finally(() => {
        allowanceRequest = undefined
      })
    return allowanceRequest
  }
  const allowanceFailure = () =>
    allowanceObserved === false
      ? createApprovalAllowanceMismatchError(transactionHash ?? submittedHash)
      : createApprovalConfirmationTimeoutError(
          transactionHash ?? submittedHash,
          lastAllowanceError,
        )

  // allowance owns success. receipt and Safe state can fail early or add proof,
  // but neither gets to wave through an allowance the next action can't use.
  // don't take a post-submit "baseline." a fast approval can land before the
  // first read, and we'd mistake new state for old state.
  /* eslint-disable no-await-in-loop */
  for (;;) {
    const readTimeoutMs = Math.max(1, pollingIntervalMs)
    const [allowanceRead, safeRead, receiptRead] = await Promise.all([
      readUpTo(readAllowance, readTimeoutMs),
      safeConnected && safeSdk && !safeOutcomeConfirmed
        ? readUpTo(readSafe, readTimeoutMs)
        : Promise.resolve(undefined),
      transactionHash
        ? readUpTo(readReceipt, readTimeoutMs)
        : Promise.resolve(undefined),
    ])
    const observedAt = Date.now()

    if (safeRead) {
      if (safeRead.status === "value") {
        firstSafeFailureAt = undefined
        lastSafeError = undefined
        const resolution = getSafeTransactionResolution(safeRead.value)
        if (resolution.status === "terminal") {
          const error = new SafeTransactionTerminalError(
            submittedHash,
            resolution.transactionStatus,
            resolution.transactionHash,
          )
          if (error.transactionHash) onTransactionHash?.(error.transactionHash)
          throw error
        }
        if (resolution.status === "executed" && !transactionHash) {
          transactionHash = resolution.transactionHash
          transactionKnownAt = observedAt
          onTransactionHash?.(transactionHash)
        }
        safeOutcomeConfirmed =
          resolution.status === "executed" &&
          safeRead.value?.txStatus === "SUCCESS"
      } else {
        firstSafeFailureAt ??= observedAt
        lastSafeError =
          safeRead.status === "error"
            ? safeRead.error
            : Error(`Safe service did not respond for ${submittedHash}`)
      }
    }

    if (receiptRead?.status === "value") {
      lastReceiptError = undefined
      if (receiptRead.value) {
        assertTransactionSucceeded(receiptRead.value, transactionHash)
        successfulReceipt = receiptRead.value
        receiptConfirmedAt ??= observedAt
      }
    } else if (receiptRead?.status === "error") {
      lastReceiptError = receiptRead.error
    }

    if (allowanceRead.status === "value") {
      // only a real false revokes readiness. rpc silence isn't chain state.
      allowanceObserved = allowanceRead.value
      lastAllowanceError = undefined
      if (allowanceRead.value) allowanceReadyAt ??= observedAt
      else allowanceReadyAt = undefined
    } else if (allowanceRead.status === "error") {
      lastAllowanceError = allowanceRead.error
    }

    if (
      successfulReceipt !== undefined &&
      allowanceReadyAt === undefined &&
      receiptConfirmedAt !== undefined &&
      observedAt - receiptConfirmedAt >= allowanceReconciliationMs
    ) {
      throw allowanceFailure()
    }

    if (allowanceReadyAt !== undefined) {
      if (successfulReceipt === undefined) {
        if (observedAt - allowanceReadyAt >= allowanceGraceMs) {
          return {
            transactionHash: transactionHash ?? submittedHash,
            confirmedBy: "allowance",
          }
        }
      } else if (safeOutcomeConfirmed) {
        return {
          transactionHash: transactionHash ?? submittedHash,
          confirmedBy: "receipt",
          receipt: successfulReceipt,
        }
      } else {
        // a Safe receipt only proves the outer execTransaction didn't revert.
        // give the service a moment to report an inner batch failure.
        safeOutcomeGraceStartedAt ??= observedAt
        if (observedAt - safeOutcomeGraceStartedAt >= safeOutcomeGraceMs) {
          return {
            transactionHash: transactionHash ?? submittedHash,
            confirmedBy: "allowance",
            receipt: successfulReceipt,
          }
        }
      }
    } else {
      safeOutcomeGraceStartedAt = undefined
    }

    if (
      firstSafeFailureAt !== undefined &&
      observedAt - firstSafeFailureAt >= SAFE_EXECUTION_SERVICE_FAILURE_GRACE_MS
    ) {
      throw lastSafeError
    }
    if (
      safeConnected &&
      !transactionHash &&
      observedAt - startedAt >= safeExecutionTimeoutMs
    ) {
      throw createSafeExecutionTimeoutError(
        submittedHash,
        safeExecutionTimeoutMs,
      )
    }
    if (
      transactionKnownAt !== undefined &&
      observedAt - transactionKnownAt >= timeoutMs
    ) {
      throw successfulReceipt === undefined
        ? createApprovalConfirmationTimeoutError(
            transactionHash ?? submittedHash,
            lastReceiptError ?? lastAllowanceError,
          )
        : allowanceFailure()
    }

    if (safeConnected && !transactionHash) {
      onWaitingForSafeExecution?.(observedAt - startedAt)
    }
    const nextPollMs =
      safeConnected &&
      !transactionHash &&
      observedAt - startedAt >= SAFE_EXECUTION_FAST_POLL_WINDOW_MS
        ? Math.max(pollingIntervalMs, SAFE_EXECUTION_SLOW_POLL_INTERVAL_MS)
        : pollingIntervalMs
    await delay(nextPollMs)
  }
  /* eslint-enable no-await-in-loop */
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
