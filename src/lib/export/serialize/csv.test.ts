/** @jest-environment node */

import { createCsv, csvCell } from "./csv"

describe("export CSV serializer", () => {
  it("uses RFC 4180 escaping and LF line endings", () => {
    expect(
      createCsv(["a", "b"], [{ a: 'hello, "world"', b: "line\nbreak" }]),
    ).toBe('a,b\n"hello, ""world""","line\nbreak"\n')
  })

  it("protects spreadsheet formulas without corrupting signed numbers", () => {
    expect(csvCell('=HYPERLINK("https://example.test")')).toBe(
      '"\'=HYPERLINK(""https://example.test"")"',
    )
    expect(csvCell("-123.45")).toBe("-123.45")
  })

  it("serializes bigint values exactly", () => {
    expect(createCsv(["raw"], [{ raw: 9_007_199_254_740_993n }])).toBe(
      "raw\n9007199254740993\n",
    )
  })
})
