/** @jest-environment node */
import { toFunctionSelector } from "viem"

import { describeLenderError } from "./contractErrors"

const hint = "This market accepts shared KYC."
it.each([
  { cause: { data: { errorName: "NotApprovedLender" } } },
  { error: { data: toFunctionSelector("NotApprovedLender()") } },
  {
    body: JSON.stringify({
      error: { data: toFunctionSelector("NotApprovedLender()") },
    }),
  },
])(
  "explains policy denials only when the action accepts shared KYC",
  (error) => {
    expect(describeLenderError(error, true, hint)).toBe(hint)
    expect(describeLenderError(error, false, hint)).toBe(
      "This lender is not approved on the policy.",
    )
  },
)
it("preserves unrelated transaction failures", () => {
  expect(
    describeLenderError(new Error("User rejected the request"), true, hint),
  ).toBe("User rejected the request")
  expect(
    describeLenderError(
      { error: { data: toFunctionSelector("AccountBlocked()") } },
      true,
      hint,
    ),
  ).toBe("This wallet is blocked from this action.")
})
