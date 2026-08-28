import { shouldSyncPolicyLenderDraft } from "./policyLenderDraft"

describe("shouldSyncPolicyLenderDraft", () => {
  it("allows refreshed indexed data to replace a populated clean draft", () => {
    expect(
      shouldSyncPolicyLenderDraft([{ address: "0xold", status: "old" }]),
    ).toBe(true)
  })

  it("allows initial hydration", () => {
    expect(shouldSyncPolicyLenderDraft([])).toBe(true)
  })

  it.each(["new", "deleted"])(
    "preserves a draft containing a %s lender",
    (status) => {
      expect(
        shouldSyncPolicyLenderDraft([
          { address: "0xedited", status },
          { address: "0xexisting", status: "old" },
        ]),
      ).toBe(false)
    },
  )
})
