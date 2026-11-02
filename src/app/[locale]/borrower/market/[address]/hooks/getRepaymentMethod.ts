import { BaseTransaction } from "@safe-global/safe-apps-sdk"
import {
  getLensContract,
  getLensV2Contract,
  Market,
  MarketVersion,
  TokenAmount,
} from "@wildcatfi/wildcat-sdk"

import { simulateSafeRepayment } from "./simulateSafeRepayment"

const arithmeticPanicData = `0x4e487b71${"0".repeat(62)}11`

const isArithmeticPanic = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "data" in error &&
  error.data === arithmeticPanicData

/** Select a repayment call before submitting anything to the wallet. */
export async function getRepaymentMethod(
  market: Market,
  amount: TokenAmount,
  approvals: readonly BaseTransaction[] = [],
) {
  const { contract } = market
  const blockTag = await contract.provider.getBlockNumber()
  const lens =
    market.version === MarketVersion.V1
      ? getLensContract(market.chainId, market.provider)
      : getLensV2Contract(market.chainId, market.provider)
  const state = await lens.getMarketData(market.address, { blockTag })
  if (state.isClosed) throw Error("Cannot repay a closed market")

  const maxBatches = state.unpaidWithdrawalBatchExpiries.length

  const safeAddress = approvals.length
    ? await market.signer.getAddress()
    : undefined

  // With Safe approvals, simulate the entire candidate batch so that pending
  // withdrawal settlement and rounding see the incoming repayment as well.
  const simulate = async (batchCount?: number) => {
    if (safeAddress) {
      const data =
        batchCount === undefined
          ? contract.interface.encodeFunctionData("repay", [amount.raw])
          : contract.interface.encodeFunctionData(
              "repayAndProcessUnpaidWithdrawalBatches",
              [amount.raw, batchCount],
            )
      await simulateSafeRepayment(
        contract.provider,
        safeAddress,
        [
          ...approvals,
          {
            to: market.address,
            value: "0",
            data,
          },
        ],
        blockTag,
      )
    } else if (batchCount === undefined) {
      await contract.callStatic.repay(amount.raw, { blockTag })
    } else {
      await contract.callStatic.repayAndProcessUnpaidWithdrawalBatches(
        amount.raw,
        batchCount,
        { blockTag },
      )
    }
  }

  if (maxBatches > 0) {
    try {
      await simulate(maxBatches)
      return { processUnpaidWithdrawals: true, maxBatches }
    } catch (error) {
      if (!isArithmeticPanic(error)) throw error

      // Confirm the panic occurs even without walking the queue. A panic
      // inside batch processing must not be mistaken for the legacy subtraction.
      try {
        await simulate(0)
      } catch (withoutBatchesError) {
        if (!isArithmeticPanic(withoutBatchesError)) throw withoutBatchesError

        // The repayment itself must succeed independently at the same block.
        await simulate()
        return { processUnpaidWithdrawals: false, maxBatches }
      }
      throw error
    }
  }

  await simulate()
  return { processUnpaidWithdrawals: false, maxBatches }
}
