/// Pins the product#608 wiring mechanically: both deposit input branches
/// carry the Max control through the shared handler, the transaction
/// amount routes through the effective-amount rule, and manual edits
/// clear the exact fill.
import * as fs from "fs"
import * as path from "path"

const MODAL = path.resolve(
  __dirname,
  "..",
  "app",
  "[locale]",
  "lender",
  "market",
  "[address]",
  "components",
  "Modals",
  "DepositModal",
  "index.tsx",
)

const source = fs.readFileSync(MODAL, "utf8")

describe("deposit max wiring", () => {
  it("fills through the shared helper", () => {
    expect(source).toContain("fillMaxDepositInput")
    expect(source).toContain("handleClickMaxAmount")
  })

  it("renders the Max control in both branches", () => {
    const occurrences = source.split("handleClickMaxAmount}").length - 1
    expect(occurrences).toBe(2)
  })

  it("routes the transaction amount through the effective-amount rule", () => {
    expect(source).toContain("effectiveDepositAmount")
  })

  it("clears the exact fill on manual edits", () => {
    const handler = source.slice(
      source.indexOf("const handleAmountChange"),
      source.indexOf("const handleClickMaxAmount"),
    )
    expect(handler).toContain("setExactAmount(undefined)")
  })

  it("hides the control when nothing can be deposited", () => {
    expect(source).toContain(
      "const showMaxButton = !marketAccount.maximumDeposit.raw.isZero()",
    )
  })

  it("never fills a comma-formatted string", () => {
    const handler = source.slice(
      source.indexOf("const handleClickMaxAmount"),
      source.indexOf("const showMaxButton"),
    )
    expect(handler).not.toContain("formatTokenWithCommas")
  })
})
