import {
  assertMlaTemplateSignableAt,
  isMlaTemplateSignableAt,
  isRetiredMlaTemplateError,
} from "./mlaTemplateRetirement"

const RETIRED_AT = new Date("2026-11-19T10:00:00Z")

describe("isMlaTemplateSignableAt", () => {
  it("takes any signature while the template is not retired", () => {
    expect(isMlaTemplateSignableAt(null, Date.now())).toBe(true)
    expect(isMlaTemplateSignableAt(undefined, Date.now())).toBe(true)
  })

  it("keeps signatures made before retirement and refuses later ones", () => {
    expect(isMlaTemplateSignableAt(RETIRED_AT, +RETIRED_AT - 1)).toBe(true)
    expect(isMlaTemplateSignableAt(RETIRED_AT, +RETIRED_AT)).toBe(false)
    // As the template detail route returns it.
    expect(
      isMlaTemplateSignableAt(RETIRED_AT.toISOString(), +RETIRED_AT + 1),
    ).toBe(false)
  })
})

it("names the retired template in the error that stops signing", () => {
  const sign = () =>
    assertMlaTemplateSignableAt(
      { name: "Stormwind MLA", retiredAt: RETIRED_AT },
      +RETIRED_AT + 1,
    )
  expect(sign).toThrow(/Stormwind MLA" has been retired/)
  try {
    sign()
  } catch (error) {
    expect(isRetiredMlaTemplateError(error)).toBe(true)
  }
  expect(isRetiredMlaTemplateError(new Error("other"))).toBe(false)
})
