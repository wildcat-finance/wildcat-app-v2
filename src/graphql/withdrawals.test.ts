import {
  GET_INCOMPLETE_WITHDRAWALS_FOR_MARKET,
  GET_LENDER_WITHDRAWALS_FOR_MARKET,
} from "./withdrawals"

const getMissingFragmentDefinitions = (document: {
  definitions: readonly unknown[]
}) => {
  const definitions = new Set<string>()
  const spreads = new Set<string>()
  const seen = new WeakSet<object>()

  const walk = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }
    if (!value || typeof value !== "object") return
    if (seen.has(value)) return
    seen.add(value)

    const node = value as {
      kind?: string
      name?: { value?: string }
    }
    const name = node.name?.value
    if (node.kind === "FragmentDefinition" && name) definitions.add(name)
    if (node.kind === "FragmentSpread" && name) spreads.add(name)
    Object.values(value).forEach(walk)
  }

  walk(document.definitions)
  return Array.from(spreads)
    .filter((name) => !definitions.has(name))
    .sort()
}

describe("withdrawal GraphQL escape hatches", () => {
  it.each([
    GET_INCOMPLETE_WITHDRAWALS_FOR_MARKET,
    GET_LENDER_WITHDRAWALS_FOR_MARKET,
  ])("is a self-contained GraphQL document", (document) => {
    expect(getMissingFragmentDefinitions(document)).toEqual([])
  })
})
