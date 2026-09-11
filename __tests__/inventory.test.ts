import {
  declaredOf,
  duplicateInventoryIds,
  inventoryIds,
  scanSpecTitles,
} from "../e2e/lib/inventory"

const SRC = `
test.describe.serial("lender flows: discovery", () => {
  test("setup: fixtures — chain time, funds, borrower profile row", async () => {})
  test("LEN-07b: back from a borrower profile returns to the lender area", async ({ page }) => {
    test.skip(!fx, "no fixture — see setup")
  })
  test("BON-03: the invited borrower accepts and is registered", async () => {})
  test("BOP-14b: 2-week jump — lock expires, borrower resets the ratio", async () => {})
  test("MKT-M01: the create-market template latch", async () => {})
  test("V2P-01: deploy a fixed-term market on the protocol", async () => {})
  test.fixme(
    "WAL-01: Safe connect",
    async () => {},
  )
  test.fail("BOP-17b: the permissionless APR reduction path", async () => {})
  test("stack is healthy and the pinned market exists", async () => {})
  test("teardown: suite left the shared fixtures intact", async () => {})
})
`

describe("scanSpecTitles", () => {
  const inv = scanSpecTitles(SRC, "e2e/lenderflows/discovery.spec.ts")

  it("finds every declaration, including one whose title is on its own line", () => {
    expect(inv.map((r) => r.id)).toEqual([
      null, // setup:
      "LEN-07b",
      "BON-03",
      "BOP-14b",
      "MKT-M01",
      "V2P-01",
      "WAL-01",
      "BOP-17b",
      null, // smoke row
      null, // teardown:
    ])
  })

  it("records how each row was declared, and ignores runtime test.skip(cond, reason)", () => {
    expect(inv.map((r) => r.kind)).toEqual([
      "test",
      "test",
      "test",
      "test",
      "test",
      "test",
      "fixme",
      "fail",
      "test",
      "test",
    ])
    expect(
      inv.every((r) => r.file === "e2e/lenderflows/discovery.spec.ts"),
    ).toBe(true)
    expect(inv.some((r) => r.title.startsWith("no fixture"))).toBe(false)
  })

  it("reports duplicates and the distinct id set", () => {
    expect(duplicateInventoryIds(inv)).toEqual([])
    expect(duplicateInventoryIds([...inv, ...inv])).toEqual([
      "BON-03",
      "BOP-14b",
      "BOP-17b",
      "LEN-07b",
      "MKT-M01",
      "V2P-01",
      "WAL-01",
    ])
    expect(inventoryIds(inv).size).toBe(7)
  })

  it("distinguishes a fixme'd row from an absent one", () => {
    expect(declaredOf(inv, "WAL-01")).toBe("declared-skipped")
    expect(declaredOf(inv, "LEN-07b")).toBe("declared")
    expect(declaredOf(inv, "LEN-99")).toBe("absent")
  })
})
