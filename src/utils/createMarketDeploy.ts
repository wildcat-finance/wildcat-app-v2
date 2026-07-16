import { DeployMarketStatus, MarketType } from "@wildcatfi/wildcat-sdk"

type CreateMarketDeployRoutingInput = {
  implementationType: MarketType
  commitmentFeePercent?: number
}

type CreateMarketDeployRoutingOutput =
  | {
      marketType: "legacy"
      commitmentFeeBips?: undefined
    }
  | {
      marketType: "revolving"
      commitmentFeeBips: number
    }

export const getCreateMarketDeployRouting = ({
  implementationType,
  commitmentFeePercent,
}: CreateMarketDeployRoutingInput): CreateMarketDeployRoutingOutput => {
  if (implementationType === "legacy") {
    return {
      marketType: "legacy",
    }
  }

  if (commitmentFeePercent === undefined) {
    throw new Error("Commitment fee percent is required for revolving markets")
  }

  return {
    marketType: "revolving",
    commitmentFeeBips: Math.round(commitmentFeePercent * 100),
  }
}

export const getDeployMarketPreviewError = (
  status: Exclude<DeployMarketStatus, DeployMarketStatus.Ready>,
) => {
  if (status === DeployMarketStatus.InvalidAccessConfiguration) {
    return "Restricted withdrawals require restricted deposits and restricted or disabled transfers"
  }
  if (status === DeployMarketStatus.MinimumDepositTooHigh) {
    return "Minimum deposit is too large for this periodic market"
  }
  return `Market is not ready for deployment: ${status}`
}
