/// Pins the product#538 wiring mechanically: the terminate modal selects its
/// flow through the routing helper, renders the blocked view, and no longer
/// hardcodes the ready-check that sent every blocked market to the repay
/// flow.
import * as fs from "fs"
import * as path from "path"

const MODAL = path.resolve(
  __dirname,
  "..",
  "app",
  "[locale]",
  "borrower",
  "market",
  "[address]",
  "components",
  "Modals",
  "TerminateMarket",
)

const read = (relative: string) =>
  fs.readFileSync(path.join(MODAL, relative), "utf8")

describe("terminate modal wiring", () => {
  const entry = read("index.tsx")

  it("routes flows through the helper", () => {
    expect(entry).toContain("routeTermination")
    expect(entry).not.toContain("isReadyForTermination")
  })

  it("renders the blocked view", () => {
    expect(entry).toContain("BlockedFlow")
  })

  it("decides the flow when the modal opens and then holds it", () => {
    expect(entry).toContain("[isModalOpen]")
  })

  it("keeps the repay flow for indebted markets", () => {
    expect(entry).toContain("RepayAndTerminateFlow")
  })

  it("blocked view explains instead of asking for repayment", () => {
    const blocked = read(path.join("BlockedFlow", "index.tsx"))
    expect(blocked).toContain("earlyClosure.title")
    expect(blocked).toContain("earlyClosure.maturity")
    expect(blocked).toContain("earlyClosure.termReduction")
    expect(blocked).not.toContain("repayRemaining")
  })
})
