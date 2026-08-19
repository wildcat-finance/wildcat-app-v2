import { MarketAccount } from "@wildcatfi/wildcat-sdk"

import { compareByHighestYield } from "./marketSort"

const makeAccount = (
  address: string,
  configuredAprBips: number,
  effectiveLenderAprBips: number,
) =>
  ({
    market: {
      address,
      annualInterestBips: configuredAprBips,
      currentAprDisplayBips: {
        isRevolving: true,
        configuredAprKind: "utilization",
        configuredAprBips,
        currentProtocolAprBips: effectiveLenderAprBips,
        currentEffectiveLenderAprBips: effectiveLenderAprBips,
      },
    },
  }) as unknown as MarketAccount

describe("marketSort", () => {
  it("sorts highest yield by the effective lender APR", () => {
    const higherConfiguredApr = makeAccount(
      "0x1111111111111111111111111111111111111111",
      1_000,
      500,
    )
    const higherEffectiveApr = makeAccount(
      "0x2222222222222222222222222222222222222222",
      800,
      900,
    )

    expect(
      [higherConfiguredApr, higherEffectiveApr].sort(compareByHighestYield),
    ).toEqual([higherEffectiveApr, higherConfiguredApr])
  })
})
