import {
  getLensContract,
  getLensV2Contract,
  Market,
  MarketVersion,
  TokenAmount,
} from "@wildcatfi/wildcat-sdk"

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
  approvalRequired: boolean,
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

  // A Safe may approve and repay in one proposal. A standalone repayment
  // simulation would fail on its existing allowance, so use the fresh quote;
  // the Safe validates the complete proposal including its approvals.
  if (approvalRequired) {
    const assetsAfterRepayment = state.totalAssets.add(amount.raw)
    const reservedAssets = state.normalizedUnclaimedWithdrawals.add(
      state.lastAccruedProtocolFees,
    )
    return {
      processUnpaidWithdrawals:
        maxBatches > 0 && assetsAfterRepayment.gte(reservedAssets),
      maxBatches,
    }
  }

  if (maxBatches > 0) {
    try {
      await contract.callStatic.repayAndProcessUnpaidWithdrawalBatches(
        amount.raw,
        maxBatches,
        { blockTag },
      )
      return { processUnpaidWithdrawals: true, maxBatches }
    } catch (error) {
      if (!isArithmeticPanic(error)) throw error

      // Confirm the panic occurs even without walking the queue. A panic
      // inside batch processing must not be mistaken for the legacy subtraction.
      try {
        await contract.callStatic.repayAndProcessUnpaidWithdrawalBatches(
          amount.raw,
          0,
          { blockTag },
        )
      } catch (withoutBatchesError) {
        if (!isArithmeticPanic(withoutBatchesError)) throw withoutBatchesError

        // The repayment itself must succeed independently at the same block.
        await contract.callStatic.repay(amount.raw, { blockTag })
        return { processUnpaidWithdrawals: false, maxBatches }
      }
      throw error
    }
  }

  await contract.callStatic.repay(amount.raw, { blockTag })
  return { processUnpaidWithdrawals: false, maxBatches }
}
