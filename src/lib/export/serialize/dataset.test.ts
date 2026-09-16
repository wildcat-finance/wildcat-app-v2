/** @jest-environment node */

import {
  deserializeDataset,
  deserializeDatasetWithSize,
  serializeDataset,
} from "./dataset"
import { MarketDataset } from "../types"

const dataset = {
  events: [
    {
      amountRaw: 10n,
      args: { baseInterestRay: "123", delinquencyFeeRay: "0" },
    },
  ],
  transactions: [{ depositedRaw: 123n, gasUsed: 45n }],
  interestAccruals: [{ baseInterestRay: 67n }],
  positions: {
    "0xabc": { earningsRaw: -8n, annualEarnings: { "2026": 9n } },
  },
  manifest: { delinquencyEpisodes: [] },
} as unknown as MarketDataset

describe("market dataset codec", () => {
  it("round-trips schema-known bigint fields", () => {
    expect(deserializeDataset(serializeDataset(dataset))).toEqual(dataset)
  })

  it("does not coerce decoded event detail strings by field name", () => {
    const decoded = deserializeDataset(serializeDataset(dataset))
    expect(decoded.events[0].args).toEqual({
      baseInterestRay: "123",
      delinquencyFeeRay: "0",
    })
  })

  it("emits deterministic gzip bytes", () => {
    const encoded = serializeDataset(dataset)
    expect(encoded).toEqual(serializeDataset(dataset))
    expect(encoded.readUInt32LE(4)).toBe(0)
    expect(encoded[9]).toBe(255)
  })

  it("rejects gzip data that expands beyond the dataset bound", () => {
    const { gzipSync } =
      jest.requireActual<typeof import("node:zlib")>("node:zlib")
    const oversized = gzipSync(Buffer.from("123456"))
    expect(() => deserializeDatasetWithSize(oversized, 5)).toThrow()
  })
})
