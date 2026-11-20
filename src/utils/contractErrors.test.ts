/** @jest-environment node */
import { encodeErrorResult, parseAbi, toFunctionSelector } from "viem"

import { describeLenderError } from "./contractErrors"

const standardErrors = parseAbi(["error Error(string)", "error Panic(uint256)"])
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

it("preserves standard Solidity reasons and panic codes in nested wallet errors", () => {
  const data = encodeErrorResult({
    abi: standardErrors,
    errorName: "Error",
    args: ["Transfer exceeds balance"],
  })
  expect(describeLenderError({ error: { data } }, true, hint)).toBe(
    "Transfer exceeds balance",
  )
  const panic = encodeErrorResult({
    abi: standardErrors,
    errorName: "Panic",
    args: [BigInt(0x11)],
  })
  expect(describeLenderError({ cause: { data: panic } }, false, hint)).toBe(
    "Solidity panic (0x11)",
  )
})

it.each(["Error", "Panic"])(
  "keeps the wallet reason when %s has no arguments",
  (errorName) => {
    expect(
      describeLenderError(
        { errorName, reason: "execution details" },
        true,
        hint,
      ),
    ).toBe("execution details")
  },
)
