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

export const waitForSafeTransactionHash = async (
  sdk: SafeSdkLike,
  safeTxHash: string,
): Promise<string> =>
  new Promise((resolve) => {
    const check = async () => {
      const transactionBySafeHash = await sdk.txs.getBySafeTxHash(safeTxHash)
      if (transactionBySafeHash?.txHash) {
        resolve(transactionBySafeHash.txHash)
      } else {
        setTimeout(check, 1000)
      }
    }
    check()
  })

export type SafeTransactionResolution =
  | { status: "pending" }
  | { status: "executed"; transactionHash: string }
  | { status: "terminal"; transactionStatus: "CANCELLED" | "FAILED" }

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
  ) {
    super(`Safe transaction ${transactionStatus.toLowerCase()}`)
    this.name = "SafeTransactionTerminalError"
  }
}

const APPROVAL_CONFIRMATION_POLL_INTERVAL_MS = 1000
const APPROVAL_CONFIRMATION_TIMEOUT_MS = 180_000

const createApprovalConfirmationTimeoutError = (submittedHash: string) => {
  const error = Error(`Approval confirmation timed out: ${submittedHash}`)
  error.name = "ApprovalConfirmationTimeoutError"
  return error
}

export const isApprovalAllowanceSufficient = (
  allowance: bigint,
  requiredAllowance: bigint,
): boolean =>
  requiredAllowance === BigInt(0)
    ? allowance === BigInt(0)
    : allowance >= requiredAllowance

export const waitForApproval = async ({
  provider,
  hash,
  isAllowanceSufficient,
  safeConnected = false,
  safeSdk,
  onTransactionHash,
  pollingIntervalMs = APPROVAL_CONFIRMATION_POLL_INTERVAL_MS,
  timeoutMs = APPROVAL_CONFIRMATION_TIMEOUT_MS,
}: {
  provider?: unknown
  hash: TransactionHashLike
  isAllowanceSufficient: () => Promise<boolean>
  safeConnected?: boolean
  safeSdk?: SafeSdkLike
  onTransactionHash?: (hash: string) => void
  pollingIntervalMs?: number
  timeoutMs?: number
}): Promise<string> => {
  if (safeConnected && !safeSdk) {
    throw Error("No Safe SDK")
  }

  const submittedHash = toTransactionHashString(hash)
  let transactionHash: string | undefined = safeConnected
    ? undefined
    : submittedHash
  let stopped = false
  let timeout: ReturnType<typeof setTimeout> | undefined

  if (transactionHash) onTransactionHash?.(transactionHash)

  const poll = async (): Promise<string> => {
    if (stopped) return transactionHash ?? submittedHash

    try {
      if (await isAllowanceSufficient()) {
        return transactionHash ?? submittedHash
      }
    } catch {
      // Transient allowance reads should not strand an otherwise valid tx.
    }

    if (stopped) return transactionHash ?? submittedHash

    if (safeConnected && safeSdk && !transactionHash) {
      try {
        const transaction = await safeSdk.txs.getBySafeTxHash(submittedHash)
        const resolution = getSafeTransactionResolution(transaction)
        if (resolution.status === "terminal") {
          throw new SafeTransactionTerminalError(
            submittedHash,
            resolution.transactionStatus,
          )
        }
        if (resolution.status === "executed") {
          transactionHash = resolution.transactionHash
          onTransactionHash?.(transactionHash)
        }
      } catch (error) {
        if (error instanceof SafeTransactionTerminalError) throw error
        // Safe service failures are retried until the overall timeout.
      }
    }

    if (stopped) return transactionHash ?? submittedHash

    if (transactionHash && isTransactionReceiptRequestProvider(provider)) {
      let receipt: unknown
      try {
        receipt = await provider.request({
          method: "eth_getTransactionReceipt",
          params: [transactionHash],
        })
      } catch {
        // Receipt lookup failures are retried; allowance remains canonical.
      }
      if (stopped) return transactionHash ?? submittedHash
      if (receipt) assertTransactionSucceeded(receipt, transactionHash)
    }

    await new Promise<void>((resolve) => {
      setTimeout(resolve, Math.max(1, pollingIntervalMs))
    })
    return poll()
  }

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(
      () => reject(createApprovalConfirmationTimeoutError(submittedHash)),
      Math.max(0, timeoutMs),
    )
  })

  try {
    return await Promise.race([poll(), timeoutPromise])
  } finally {
    stopped = true
    if (timeout) clearTimeout(timeout)
  }
}

export const waitForSafeTransactionExecution = async (
  sdk: SafeSdkLike,
  safeTxHash: string,
): Promise<string> =>
  new Promise((resolve, reject) => {
    const check = async () => {
      try {
        const transaction = await sdk.txs.getBySafeTxHash(safeTxHash)
        const resolution = getSafeTransactionResolution(transaction)
        if (resolution.status === "executed") {
          resolve(resolution.transactionHash)
          return
        }
        if (resolution.status === "terminal") {
          reject(
            new SafeTransactionTerminalError(
              safeTxHash,
              resolution.transactionStatus,
            ),
          )
          return
        }
        setTimeout(check, 1000)
      } catch (error) {
        reject(error)
      }
    }
    check()
  })

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
      ? await waitForSafeTransactionHash(safeSdk, submittedHash)
      : submittedHash
  const receipt = await provider.waitForTransaction(transactionHash)
  return {
    hash: transactionHash,
    receipt: assertTransactionSucceeded(receipt, transactionHash),
  }
}
