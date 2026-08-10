/** @jest-environment node */

import {
  canonicalizeExportRequest,
  hashExportRequest,
  parseExportRequest,
} from "./validation"

const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
const B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"

describe("export request validation", () => {
  it("canonicalizes set-like fields before hashing", () => {
    const left = canonicalizeExportRequest(
      parseExportRequest({
        chainId: 1,
        markets: [B.toUpperCase().replace("0X", "0x"), A, A],
        statements: ["position", "market_condition", "position"],
        addresses: [B, A, B],
        format: "pdf",
      }),
      123,
      `0x${"1".repeat(64)}`,
    )
    const right = canonicalizeExportRequest(
      parseExportRequest({
        chainId: 1,
        markets: [A, B],
        statements: ["market_condition", "position"],
        addresses: [A, B],
        format: "pdf",
      }),
      123,
      `0x${"1".repeat(64)}`,
    )
    expect(left).toEqual(right)
    expect(hashExportRequest(left)).toBe(hashExportRequest(right))
    expect(
      hashExportRequest({
        ...right,
        snapshotBlockHash: `0x${"2".repeat(64)}`,
      }),
    ).not.toBe(hashExportRequest(right))
  })

  it("requires addresses only when position statements are selected", () => {
    expect(() =>
      parseExportRequest({
        chainId: 1,
        markets: "all",
        statements: ["position"],
        format: "xlsx",
      }),
    ).toThrow("At least one address is required")
    expect(
      parseExportRequest({
        chainId: 1,
        markets: "all",
        statements: [],
        format: "xlsx",
      }).addresses,
    ).toEqual([])
  })

  it("rejects invalid dates and unbounded request arrays", () => {
    expect(() =>
      parseExportRequest({
        chainId: 1,
        markets: "all",
        statements: [],
        addresses: [],
        dateFrom: "2026-02-31",
        format: "pdf",
      }),
    ).toThrow("Invalid calendar date")
    expect(() =>
      parseExportRequest({
        chainId: 1,
        markets: Array.from(
          { length: 51 },
          (_, index) => `0x${index.toString(16).padStart(40, "0")}`,
        ),
        statements: [],
        addresses: [],
        format: "pdf",
      }),
    ).toThrow()
  })
})
