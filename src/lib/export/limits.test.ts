/** @jest-environment node */

import { assertExportWithinLimits, countExportStatements } from "./limits"
import { CanonicalExportRequest } from "./types"

const request: CanonicalExportRequest = {
  chainId: 1,
  markets: "all",
  statements: ["market_condition", "borrower", "position"],
  addresses: Array.from(
    { length: 5 },
    (_, index) => `0x${index.toString(16).padStart(40, "0")}`,
  ),
  format: "pdf",
  snapshotBlock: "123",
  snapshotBlockHash: `0x${"1".repeat(64)}`,
}

describe("export resource limits", () => {
  it("counts every rendered statement", () => {
    expect(countExportStatements(request, 10)).toBe(70)
  })

  it("rejects work before rendering when the statement bound is exceeded", () => {
    expect(() => assertExportWithinLimits(request, 15)).toThrow(
      "105 statements",
    )
  })
})
