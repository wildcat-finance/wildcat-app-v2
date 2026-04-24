import { getCreateMarketDeployRouting } from "./createMarketDeploy"

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
})
