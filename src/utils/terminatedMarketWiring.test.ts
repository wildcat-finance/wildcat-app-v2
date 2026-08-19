/// Pins the product#442 / product#443 wiring mechanically: the page and
/// sidebar route through the section policy helper, the Borrow and Repay
/// render block is guarded, and the orphaned statement machinery is gone.
import * as fs from "fs"
import * as path from "path"

const SRC = path.resolve(__dirname, "..")

const read = (relative: string) =>
  fs.readFileSync(path.join(SRC, relative), "utf8")

const PAGE = path.join(
  "app",
  "[locale]",
  "borrower",
  "market",
  "[address]",
  "page.tsx",
)
const SIDEBAR = path.join("components", "Sidebar", "MarketSidebar", "index.tsx")
const STATEMENT_MODAL_DIR = path.join(
  SRC,
  "app",
  "[locale]",
  "borrower",
  "market",
  "[address]",
  "components",
  "Modals",
  "StatementModal",
)

describe("terminated-market wiring", () => {
  it("page falls back through the helper and guards the render block", () => {
    const page = read(PAGE)
    expect(page).toContain("borrowerMarketFallbackSection")
    expect(page).toContain("showBorrowRepayTab")
  })

  it("sidebar shows the tab through the helper", () => {
    expect(read(SIDEBAR)).toContain("showBorrowRepayTab")
  })

  it("statement modal directory is gone", () => {
    expect(fs.existsSync(STATEMENT_MODAL_DIR)).toBe(false)
  })

  it("no source references the statement modal or its i18n keys", () => {
    const locales = read(path.join("locales", "en", "en.json"))
    expect(locales).not.toContain('"statement"')
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) return walk(full)
        return /\.(ts|tsx)$/.test(entry.name) ? [full] : []
      })
    const offenders = walk(SRC).filter(
      (file) =>
        !file.endsWith("terminatedMarketWiring.test.ts") &&
        fs.readFileSync(file, "utf8").includes("StatementModal"),
    )
    expect(offenders).toEqual([])
  })
})
