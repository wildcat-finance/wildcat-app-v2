import { DeployMarketStatus } from "@wildcatfi/wildcat-sdk"

import {
  getCreateMarketDeployRouting,
  getDeployMarketPreviewError,
} from "./createMarketDeploy"

describe("createMarketDeploy", () => {
  it("routes legacy markets without commitment fee", () => {
    expect(
      getCreateMarketDeployRouting({
        implementationType: "legacy",
      }),
    ).toEqual({
      marketType: "legacy",
    })
  })

  it("routes revolving markets and converts percent to bips", () => {
    expect(
      getCreateMarketDeployRouting({
        implementationType: "revolving",
        commitmentFeePercent: 2.5,
      }),
    ).toEqual({
      marketType: "revolving",
      commitmentFeeBips: 250,
    })
  })

  it("requires commitment fee percent for revolving markets", () => {
    expect(() =>
      getCreateMarketDeployRouting({
        implementationType: "revolving",
      }),
    ).toThrow("Commitment fee percent is required for revolving markets")
  })

  it.each<[Exclude<DeployMarketStatus, DeployMarketStatus.Ready>, string]>([
    [
      DeployMarketStatus.InvalidAccessConfiguration,
      "Restricted withdrawals require restricted deposits and restricted or disabled transfers",
    ],
    [
      DeployMarketStatus.MinimumDepositTooHigh,
      "Minimum deposit is too large for this periodic market",
    ],
    [
      DeployMarketStatus.WrongHooksFactory,
      "Market is not ready for deployment: WrongHooksFactory",
    ],
  ])("describes rejected SDK deployment previews", (status, expected) => {
    expect(getDeployMarketPreviewError(status)).toBe(expected)
  })
})
