import {
  confirmMarketDeployment,
  getDeployedMarketFromReceipt,
  type MarketDeploymentReceipt,
} from "./marketDeploymentReceipt"

const factory = "0x190B42942fe9492df9CeA441dA5c43309840E93A"
const market = "0x0e38a2d3e563fe3af428b0a162666eb4a47902bb"

const topicAddress = (address: string) =>
  `0x${address.slice(2).toLowerCase().padStart(64, "0")}`

const receipt = (
  selector: string,
  indexedAddresses: string[],
): MarketDeploymentReceipt => ({
  logs: [
    {
      address: factory,
      data: "0x",
      topics: [selector, ...indexedAddresses.map(topicAddress)],
    },
  ],
})

describe("market deployment receipts", () => {
  it("extracts the market from the v2.5 factory event used by RCF deployments", () => {
    const liveRcfReceipt = receipt(
      "0x0552cf5c4747e14ddcf5dfd871616003deec2f67a7e9c3424d57850385584b9a",
      [
        "0xb63929e732156c46857c0d9b08e483f8845ed1be",
        "0x866538adcc1699116b305245c89e9ac6d960b192",
        market,
      ],
    )

    expect(getDeployedMarketFromReceipt(liveRcfReceipt, factory)).toBe(market)
  })

  it("keeps accepting the legacy factory event", () => {
    const legacyReceipt = receipt(
      "0x6f8c7c94fc16393d1ebec38de9899ba8c6bd860a025aa60063b7cf4c40a16c09",
      ["0xb63929e732156c46857c0d9b08e483f8845ed1be", market],
    )

    expect(getDeployedMarketFromReceipt(legacyReceipt, factory)).toBe(market)
  })

  it("falls back to the predicted CREATE2 address when code exists", async () => {
    const getCode = jest.fn().mockResolvedValue("0x6000")

    await expect(
      confirmMarketDeployment({
        receipt: { logs: [] },
        predictedMarket: market,
        factoryAddress: factory,
        getCode,
      }),
    ).resolves.toBe(market)
    expect(getCode).toHaveBeenCalledWith(market)
  })

  it("rejects a known event for an unexpected market", async () => {
    const unexpectedReceipt = receipt(
      "0x0552cf5c4747e14ddcf5dfd871616003deec2f67a7e9c3424d57850385584b9a",
      [
        "0xb63929e732156c46857c0d9b08e483f8845ed1be",
        "0x866538adcc1699116b305245c89e9ac6d960b192",
        "0x0000000000000000000000000000000000000001",
      ],
    )

    await expect(
      confirmMarketDeployment({
        receipt: unexpectedReceipt,
        predictedMarket: market,
        factoryAddress: factory,
        getCode: jest.fn(),
      }),
    ).rejects.toThrow("unexpected market address")
  })

  it("fails when neither a known event nor deployed code is present", async () => {
    await expect(
      confirmMarketDeployment({
        receipt: { logs: [] },
        predictedMarket: market,
        factoryAddress: factory,
        getCode: jest.fn().mockResolvedValue("0x"),
      }),
    ).rejects.toThrow("no code exists at the predicted market address")
  })
})
