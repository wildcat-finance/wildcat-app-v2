import {
  findRestrictedTerms,
  findRestrictedTermsInFields,
  hasRestrictedTerm,
  normaliseTradingName,
} from "./restrictedTradingNames"

describe("normaliseTradingName", () => {
  it("folds case, punctuation and spacing", () => {
    expect(normaliseTradingName("Growth-Bank")).toBe("growthbank")
    expect(normaliseTradingName("  Growth   Bank ")).toBe("growth bank")
  })
})

describe("findRestrictedTerms", () => {
  it("matches inside compound names", () => {
    expect(findRestrictedTerms("GrowthBank")).toContain("bank")
    expect(findRestrictedTerms("Growth-Bank")).toContain("bank")
    expect(findRestrictedTerms("growth bank")).toContain("bank")
  })

  it("matches terms written as separate words", () => {
    expect(findRestrictedTerms("Meridian Wealth Management")).toContain(
      "wealth management",
    )
  })

  it("matches implied official status and endorsement", () => {
    expect(findRestrictedTerms("Sovereign Yield Partners")).toContain(
      "sovereign",
    )
    expect(findRestrictedTerms("Chartered Digital")).toContain("chartered")
  })

  it("matches sector-specific terms", () => {
    expect(findRestrictedTerms("Takaful Holdings")).toContain("takaful")
  })

  it("leaves ordinary names alone", () => {
    expect(findRestrictedTerms("Northgate Consulting Ltd")).toEqual([])
    expect(findRestrictedTerms("Bluewater Capital")).toEqual([])
    expect(findRestrictedTerms("Halcyon Partners")).toEqual([])
  })

  it("accepts false positives from substring matching", () => {
    // Embankment is not a bank. Flagging it costs one glance; missing a
    // compound name costs what this list exists to prevent.
    expect(findRestrictedTerms("Embankment Studios")).toContain("bank")
  })

  it("is empty for absent values", () => {
    expect(findRestrictedTerms(undefined)).toEqual([])
    expect(findRestrictedTerms(null)).toEqual([])
    expect(findRestrictedTerms("")).toEqual([])
  })
})

describe("hasRestrictedTerm", () => {
  it("reports whether anything matched", () => {
    expect(hasRestrictedTerm("GrowthBank")).toBe(true)
    expect(hasRestrictedTerm("Bluewater Capital")).toBe(false)
  })
})

describe("findRestrictedTermsInFields", () => {
  it("returns only the fields that matched", () => {
    expect(
      findRestrictedTermsInFields({
        name: "Northgate Consulting Ltd",
        alias: "GrowthBank",
        description: undefined,
      }),
    ).toEqual({ alias: ["bank"] })
  })

  it("returns an empty map when nothing matched", () => {
    expect(findRestrictedTermsInFields({ name: "Halcyon Partners" })).toEqual(
      {},
    )
  })
})
