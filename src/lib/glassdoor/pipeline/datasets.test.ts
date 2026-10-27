/** @jest-environment node */

import { datasetsToPrune } from "./datasets"

const dataset = (block: number, createdAt: string) => ({
  name: `${block}-0x${block.toString(16).padStart(64, "0")}.json.gz`,
  createdAt,
})

describe("datasetsToPrune", () => {
  it("keeps the newest two and the newest of each earlier month", () => {
    const objects = [
      dataset(100, "2026-08-30T10:00:00Z"),
      dataset(120, "2026-08-31T10:00:00Z"),
      dataset(200, "2026-09-15T10:00:00Z"),
      dataset(300, "2026-10-01T10:00:00Z"),
      dataset(310, "2026-10-01T10:05:00Z"),
      dataset(320, "2026-10-01T10:10:00Z"),
      dataset(330, "2026-10-01T10:15:00Z"),
      { name: ".emptyFolderPlaceholder", createdAt: "2026-08-01T00:00:00Z" },
    ]

    expect(datasetsToPrune(objects, objects[6].name)).toEqual([
      dataset(310, "").name,
      dataset(300, "").name,
      dataset(100, "").name,
    ])
  })

  it("never deletes the current dataset", () => {
    const objects = [
      dataset(300, "2026-10-01T10:00:00Z"),
      dataset(310, "2026-10-01T10:05:00Z"),
      dataset(320, "2026-10-01T10:10:00Z"),
    ]
    expect(datasetsToPrune(objects, objects[0].name)).toEqual([])
  })
})
