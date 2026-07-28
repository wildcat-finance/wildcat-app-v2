import {
  getMlaTemplateApiPath,
  getMlaTemplatesApiPath,
} from "./templateApiPaths"

describe("MLA template API paths", () => {
  it("always scopes template reads to the selected chain", () => {
    expect(getMlaTemplatesApiPath(11155111)).toBe(
      "/api/mla/templates?chainId=11155111",
    )
    expect(getMlaTemplateApiPath(12, 9746)).toBe(
      "/api/mla/templates/12?chainId=9746",
    )
  })
})
