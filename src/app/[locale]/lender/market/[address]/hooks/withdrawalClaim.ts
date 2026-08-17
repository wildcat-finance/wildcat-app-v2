import {
  LenderWithdrawalStatus,
  PartialTransaction,
  prepareTransaction,
  wildcatMarketAbi,
} from "@wildcatfi/wildcat-sdk"
import type { Abi, Address, PublicClient } from "viem"

import {
  describeContractError,
  getContractErrorName,
} from "@/utils/contractErrors"
import { toViemTransactionRequest } from "@/utils/transactions"

const withdrawalClaimErrorAbi = [
  { type: "error", name: "WithdrawalBatchNotExpired", inputs: [] },
  { type: "error", name: "NullWithdrawalAmount", inputs: [] },
] as const satisfies Abi

type WithdrawalClaim = Pick<LenderWithdrawalStatus, "lender" | "expiry">

export const isWithdrawalExecutable = (
  withdrawal: LenderWithdrawalStatus,
): boolean => withdrawal.isExecutable

export const prepareWithdrawalClaim = (
  marketAddress: string,
  withdrawals: WithdrawalClaim[],
): PartialTransaction => {
  if (withdrawals.length === 0) {
    throw Error("No executable withdrawals are available to claim.")
  }
  if (withdrawals.length === 1) {
    return prepareTransaction({
      to: marketAddress,
      abi: wildcatMarketAbi,
      functionName: "executeWithdrawal",
      args: [withdrawals[0].lender, withdrawals[0].expiry],
    })
  }
  return prepareTransaction({
    to: marketAddress,
    abi: wildcatMarketAbi,
    functionName: "executeWithdrawals",
    args: [
      withdrawals.map(({ lender }) => lender),
      withdrawals.map(({ expiry }) => expiry),
    ],
  })
}

const waitForNextBlock = async (publicClient: PublicClient): Promise<void> => {
  const currentBlock = await publicClient.getBlockNumber()
  await new Promise<void>((resolve, reject) => {
    let unwatch: (() => void) | undefined
    let settled = false
    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      unwatch?.()
      if (error) reject(error)
      else resolve()
    }
    unwatch = publicClient.watchBlockNumber({
      onBlockNumber: (blockNumber) => {
        if (blockNumber > currentBlock) finish()
      },
      onError: (error) => finish(error),
    })
    if (settled) unwatch()
  })
}

export const preflightWithdrawalClaim = async ({
  publicClient,
  account,
  transaction,
  expiries,
}: {
  publicClient: PublicClient
  account: string
  transaction: PartialTransaction
  expiries: number[]
}): Promise<void> => {
  const simulate = () =>
    publicClient.call({
      account: account as Address,
      ...toViemTransactionRequest(transaction),
    })

  try {
    await simulate()
    return
  } catch (error) {
    if (
      getContractErrorName(error, withdrawalClaimErrorAbi) !==
      "WithdrawalBatchNotExpired"
    ) {
      throw Error(describeContractError(error, withdrawalClaimErrorAbi))
    }
  }

  const state = (await publicClient.readContract({
    address: transaction.to as Address,
    abi: wildcatMarketAbi,
    functionName: "previousState",
  })) as { isClosed: boolean; pendingWithdrawalExpiry: number }

  if (
    !state.isClosed ||
    !expiries.includes(Number(state.pendingWithdrawalExpiry))
  ) {
    throw Error(
      "This withdrawal batch is still pending. Wait for the next block and try again.",
    )
  }

  await waitForNextBlock(publicClient)
  try {
    await simulate()
  } catch (error) {
    throw Error(describeContractError(error, withdrawalClaimErrorAbi))
  }
}
