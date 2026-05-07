import { MarketType } from "@wildcatfi/wildcat-sdk"

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
