import {
  PartialTransaction,
  SafeTransactionInput,
  Signer,
  TransactionHashLike,
  toTransactionHashString,
  toSafeTransactionInput,
} from "@wildcatfi/wildcat-sdk"
import type { TransactionReceipt } from "viem"

import {
  type ContractErrorDecoder,
  describeContractError,
} from "@/utils/contractErrors"

type GasEstimatingProvider = {
  estimateGas?: (transaction: {
    to?: string
    data?: string
    from?: string
  }) => Promise<bigint>
}

export const toSafeTransactions = (
  txs: PartialTransaction[],
): SafeTransactionInput[] => txs.map(toSafeTransactionInput)

export const toEthersTransactionRequest = (tx: PartialTransaction) => ({
  to: tx.to,
  data: tx.data,
  value: (tx.value ?? BigInt(0)).toString(),
})

const GAS_LIMIT_BUFFER_PERCENT = BigInt(25)

export const sendTransactionAndWait = async (
  signer: Signer,
  tx: PartialTransaction,
  options?: { errorInterface?: ContractErrorDecoder },
) => {
  const request = toEthersTransactionRequest(tx)
  const estimator = (signer as { provider?: GasEstimatingProvider }).provider
  let gas: bigint | undefined
  if (estimator?.estimateGas) {
    try {
      const estimated = await estimator.estimateGas({
        ...request,
        from: await signer.getAddress(),
      })
      gas = (estimated * (BigInt(100) + GAS_LIMIT_BUFFER_PERCENT)) / BigInt(100)
    } catch (error) {
      throw Error(describeContractError(error, options?.errorInterface))
    }
  }

  const send = signer.sendTransaction as (
    transaction: typeof request & { gas?: bigint },
  ) => ReturnType<Signer["sendTransaction"]>
  const submitted = await send({ ...request, gas })
  if (!submitted.wait) {
    throw Error("Submitted transaction does not expose a wait function")
  }
  return submitted.wait()
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

const isWaitForTransactionProvider = (
  provider: unknown,
): provider is WaitForTransactionProvider =>
  typeof provider === "object" &&
  provider !== null &&
  "waitForTransaction" in provider &&
  typeof provider.waitForTransaction === "function"

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
  return { hash: transactionHash, receipt }
}
