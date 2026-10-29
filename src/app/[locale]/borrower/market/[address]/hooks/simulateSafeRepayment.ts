import { BaseTransaction } from "@safe-global/safe-apps-sdk"
import { BigNumber, providers, utils } from "ethers"

// The Multicall3 deployment used by all four supported chains. It is only
// delegatecalled inside a reverting eth_call, never in the submitted proposal.
const multicall3Address = "0xcA11bde05977b3631167028862bE2a173976CA11"
const safeInterface = new utils.Interface([
  "function simulateAndRevert(address targetContract, bytes calldataPayload)",
])
const multicallInterface = new utils.Interface([
  "function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) payable returns (tuple(bool success, bytes returnData)[] results)",
])

type CallResult = { success: boolean; returnData: string }

/** Simulate approvals followed by repayment, without changing Safe/token state. */
export async function simulateSafeRepayment(
  provider: providers.Provider,
  safeAddress: string,
  transactions: readonly BaseTransaction[],
  blockTag: number,
) {
  if (
    transactions.length < 2 ||
    transactions.some((tx) => !BigNumber.from(tx.value).isZero())
  ) {
    throw Error("Expected token approvals followed by an ERC20 repayment")
  }

  const batch = multicallInterface.encodeFunctionData("aggregate3", [
    transactions.map((tx) => ({
      target: tx.to,
      // Preserve individual revert data. Any failed approval still rejects
      // the simulation below; only a repayment revert can select a fallback.
      allowFailure: true,
      callData: tx.data,
    })),
  ])
  const data = safeInterface.encodeFunctionData("simulateAndRevert", [
    multicall3Address,
    batch,
  ])

  let results: CallResult[]
  try {
    let response: string
    try {
      response = await provider.call(
        { from: safeAddress, to: safeAddress, data },
        blockTag,
      )
    } catch (error) {
      // Ethers normally returns eth_call revert data. Some providers instead
      // throw it; accept it only if the complete Safe envelope decodes below.
      if (
        typeof error !== "object" ||
        error === null ||
        !("data" in error) ||
        typeof error.data !== "string"
      ) {
        throw error
      }
      response = error.data
    }

    // Safe uses a packed success word + length word + return bytes, not the
    // normal ABI encoding of (bool, bytes), which would include an offset.
    if (!utils.isHexString(response) || utils.hexDataLength(response) < 64) {
      throw Error("Missing Safe simulation response")
    }
    const success = BigNumber.from(utils.hexDataSlice(response, 0, 32))
    const length = BigNumber.from(utils.hexDataSlice(response, 32, 64))
    const returnData = utils.hexDataSlice(response, 64)
    if (!success.eq(1) || !length.eq(utils.hexDataLength(returnData))) {
      throw Error("Invalid or failed Safe simulation response")
    }
    results = multicallInterface.decodeFunctionResult("aggregate3", returnData)
      .results as CallResult[]
    if (results.length !== transactions.length) {
      throw Error("Incomplete Safe simulation response")
    }
  } catch (cause) {
    // RPC, unsupported Safe, and decoding failures are not repayment panics.
    throw Object.assign(
      Error("Could not simulate Safe approval and repayment"),
      {
        cause,
      },
    )
  }

  for (let i = 0; i < results.length; i += 1) {
    if (!results[i].success) {
      if (i < results.length - 1) {
        throw Error(`Safe approval ${i + 1} simulation reverted`)
      }
      throw Object.assign(Error("Safe repayment simulation reverted"), {
        data: results[i].returnData,
      })
    }
  }
}
