import {
  getLatestLensDeploymentName,
  SupportedChainId,
  WithdrawalBatch,
} from "@wildcatfi/wildcat-sdk"

type WithdrawalBatchLensUpdate = Parameters<
  WithdrawalBatch["applyLensUpdate"]
>[0]

export const applyLatestLensWithdrawalBatchUpdate = (
  batch: WithdrawalBatch,
  update: WithdrawalBatchLensUpdate,
  chainId: SupportedChainId,
) =>
  batch.applyLensUpdate(
    update,
    getLatestLensDeploymentName(chainId) === "MarketLensV2_5",
  )
