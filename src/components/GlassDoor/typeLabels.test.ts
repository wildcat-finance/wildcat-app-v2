import { HooksKind, Market } from "@wildcatfi/wildcat-sdk"

import { marketTypeLabels } from "./typeLabels"

const market = (
  roleProviders?: { isApproved: boolean; pullProviderIndex: number }[],
) =>
  ({
    hooksConfig: {
      kind: HooksKind.OpenTerm,
      depositRequiresAccess: true,
      transferRequiresAccess: true,
      transfersDisabled: false,
    },
    hooksInstance: roleProviders ? { roleProviders } : undefined,
  }) as unknown as Market

describe("market type labels (G4)", () => {
  it("tells a self-onboarding policy from a borrower-run allowlist", () => {
    expect(
      marketTypeLabels(market([{ isApproved: true, pullProviderIndex: 0 }])),
    ).toEqual(["Open term", "Self-onboarding", "Transfers restricted"])
    // The borrower's own push-only entry does not make a policy self-onboarding.
    expect(
      marketTypeLabels(
        market([{ isApproved: true, pullProviderIndex: 2 ** 24 - 1 }]),
      ),
    ).toEqual(["Open term", "Allowlist", "Transfers restricted"])
    // Without the hooks instance the access kind is unknown.
    expect(marketTypeLabels(market())).toEqual([
      "Open term",
      "Deposits restricted",
      "Transfers restricted",
    ])
  })
})
