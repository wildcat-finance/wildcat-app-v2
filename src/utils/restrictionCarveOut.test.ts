/// Pins the product#789 carve-out mechanically: repayment and market
/// termination must never acquire the borrower-restriction gate, and the
/// three restricted surfaces must actually be wired to it.
import * as fs from "fs"
import * as path from "path"

const REPO = path.resolve(__dirname, "..", "..")

const read = (relative: string) =>
  fs.readFileSync(path.join(REPO, relative), "utf8")

const CARVE_OUT_FILES = [
  "src/app/[locale]/borrower/market/[address]/components/Modals/RepayModal/index.tsx",
  "src/app/[locale]/borrower/market/[address]/components/Modals/TerminateMarket/index.tsx",
]

const GATED_FILES = [
  "src/app/[locale]/borrower/create-market/page.tsx",
  "src/app/[locale]/borrower/profile/edit/page.tsx",
  "src/app/[locale]/borrower/market/[address]/components/BorrowerMarketSummary/index.tsx",
  "src/app/[locale]/borrower/hooks/useBorrowerInvitationRedirect.ts",
  "src/components/Profile/ProfilePage/components/ProfileNamePageBlock/index.tsx",
]

describe("borrower restriction carve-out", () => {
  it.each(CARVE_OUT_FILES)(
    "%s never references the restriction gate",
    (file) => {
      const source = read(file)
      expect(source).not.toMatch(/[bB]orrowerRestriction/)
    },
  )

  it.each(GATED_FILES)("%s is wired to the restriction gate", (file) => {
    expect(read(file)).toContain("useBorrowerRestriction")
  })

  it("server enforcement is wired in both write routes", () => {
    expect(read("src/app/api/profiles/updates/route.ts")).toContain(
      "getBorrowerRestriction",
    )
    expect(read("src/app/api/market-summary/[market]/route.ts")).toContain(
      "getBorrowerRestriction",
    )
  })
})
