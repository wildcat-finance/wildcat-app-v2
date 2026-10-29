import { LenderWithdrawalStatus, typechain } from "@wildcatfi/wildcat-sdk"
import {
  encodeFunctionData,
  type Abi,
  type Address,
  type Hex,
  type PublicClient,
} from "viem"

import {
  describeContractError,
  getContractErrorName,
} from "@/utils/contractErrors"

const wildcatMarketAbi = typechain.WildcatMarket__factory.abi

const withdrawalClaimErrorAbi = [
  { type: "error", name: "WithdrawalBatchNotExpired", inputs: [] },
  { type: "error", name: "NullWithdrawalAmount", inputs: [] },
] as const satisfies Abi

const NEXT_BLOCK_TIMEOUT_MS = 60_000

type WithdrawalClaim = Pick<LenderWithdrawalStatus, "lender" | "expiry">

export type WithdrawalClaimTransaction = {
  to: Address
  data: Hex
}

export const prepareWithdrawalClaim = (
  marketAddress: string,
  withdrawals: WithdrawalClaim[],
): WithdrawalClaimTransaction => {
  if (withdrawals.length === 0) {
    throw Error("No executable withdrawals are available to claim.")
  }
  if (withdrawals.length === 1) {
    return {
      to: marketAddress as Address,
      data: encodeFunctionData({
        abi: wildcatMarketAbi,
        functionName: "executeWithdrawal",
        args: [withdrawals[0].lender as Address, withdrawals[0].expiry],
      }),
    }
  }
  return {
    to: marketAddress as Address,
    data: encodeFunctionData({
      abi: wildcatMarketAbi,
      functionName: "executeWithdrawals",
      args: [
        withdrawals.map(({ lender }) => lender as Address),
        withdrawals.map(({ expiry }) => expiry),
      ],
    }),
  }
}

const waitForNextBlock = async (publicClient: PublicClient): Promise<void> => {
  const currentBlock = await publicClient.getBlockNumber()
  await new Promise<void>((resolve, reject) => {
    let unwatch: (() => void) | undefined
    let timeout: ReturnType<typeof setTimeout> | undefined
    let settled = false
    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      unwatch?.()
      if (error) reject(error)
      else resolve()
    }
    timeout = setTimeout(
      () => finish(Error("Timed out waiting for the next block.")),
      NEXT_BLOCK_TIMEOUT_MS,
    )
    unwatch = publicClient.watchBlockNumber({
      onBlockNumber: (blockNumber) => {
        if (blockNumber > currentBlock) finish()
      },
      onError: (error) => finish(error),
    })
    if (settled) unwatch()
  })
}

/**
 * Simulate the claim before handing it to the wallet. In a terminated market a
 * new withdrawal batch is created with zero duration, so it stays the pending
 * batch (and `executeWithdrawal` reverts with WithdrawalBatchNotExpired) until
 * the next block. In that one case wait a block and simulate again.
 */
export const preflightWithdrawalClaim = async ({
  publicClient,
  account,
  transaction,
  expiries,
}: {
  publicClient: PublicClient
  account: string
  transaction: WithdrawalClaimTransaction
  expiries: number[]
}): Promise<void> => {
  const simulate = () =>
    publicClient.call({
      account: account as Address,
      to: transaction.to,
      data: transaction.data,
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

  const state = await publicClient.readContract({
    address: transaction.to,
    abi: wildcatMarketAbi,
    functionName: "previousState",
  })

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
