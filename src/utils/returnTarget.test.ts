import { ROUTES } from "@/routes"
import {
  parseReturnTarget,
  partyRoot,
  readReturnTargetParam,
  resolveReturnTarget,
  withReturnTarget,
} from "@/utils/returnTarget"

const JAVASCRIPT_URL = ["javascript", "alert(1)"].join(":")

describe("parseReturnTarget", () => {
  const accepted: [string, string][] = [
    ["/lender", "/lender"],
    ["/lender/my-markets", "/lender/my-markets"],
    ["/lender/all-markets", "/lender/all-markets"],
    ["/lender/market/0xabc?chainId=1", "/lender/market/0xabc?chainId=1"],
    ["/borrower", "/borrower"],
    ["/borrower/market/0xabc", "/borrower/market/0xabc"],
  ]

  it.each(accepted)("accepts %s", (value, expected) => {
    expect(parseReturnTarget(value)).toBe(expected)
  })

  const rejected: [string, string | null | undefined][] = [
    ["an absolute URL", "https://evil.example/x"],
    ["a protocol-relative path", "//evil.example/x"],
    ["a javascript scheme", JAVASCRIPT_URL],
    ["a backslash authority", "/\\evil.example/x"],
    ["a path outside the known prefixes", "/admin"],
    ["traversal that escapes a known prefix", "/lender/../../evil"],
    ["a lender agreement route, which would loop", ROUTES.lender.agreement],
    ["a borrower agreement route, which would loop", ROUTES.borrower.agreement],
    [
      "a lender agreement route with a trailing slash",
      `${ROUTES.lender.agreement}/`,
    ],
    [
      "an agreement route with a terminal dot segment",
      `${ROUTES.lender.agreement}/.`,
    ],
    ["a prefix look-alike", "/lenderevil"],
    // A browser strips tab, newline and carriage return from a URL before
    // parsing, so these fold into a protocol-relative authority. The origin
    // check catches them; these rows keep it caught.
    ["a tab folded into an authority", "/\t/evil.example/x"],
    ["a newline folded into an authority", "/\n/evil.example/x"],
    ["a carriage return folded into an authority", "/\r/evil.example/x"],
    ["userinfo smuggled onto the prefix", "/lender@evil.example"],
    ["an encoded separator in the prefix", "/lender%2F../evil"],
    ["encoded traversal", "/lender/%2e%2e/%2e%2e/evil"],
    ["an uppercase prefix", "/LENDER/x"],
    ["an empty string", ""],
    ["null", null],
    ["undefined", undefined],
  ]

  it.each(rejected)("rejects %s", (_label, value) => {
    expect(parseReturnTarget(value)).toBeNull()
  })
})

describe("parseReturnTarget behaviours worth pinning", () => {
  it("normalises dot segments before checking the prefix", () => {
    expect(parseReturnTarget("/lender/../borrower/x")).toBe("/borrower/x")
  })

  it("drops the fragment and keeps the query string", () => {
    expect(parseReturnTarget("/lender/my-markets#frag")).toBe(
      "/lender/my-markets",
    )
    expect(parseReturnTarget("/lender/market/0xabc?chainId=1")).toBe(
      "/lender/market/0xabc?chainId=1",
    )
  })

  it("accepts an in-app path carrying its own returnTo, which stays in-app", () => {
    // Harmless: the destination is the pathname, and the nested parameter is
    // read by nothing at that route. Pinned so it stays a deliberate outcome.
    expect(
      parseReturnTarget("/lender/my-markets?returnTo=https://evil.example"),
    ).toBe("/lender/my-markets?returnTo=https://evil.example")
  })
})

describe("resolveReturnTarget", () => {
  it("falls back to the lender root for a lender", () => {
    expect(resolveReturnTarget("https://evil.example", "Lender")).toBe(
      ROUTES.lender.root,
    )
  })

  it("falls back to the borrower root for a borrower", () => {
    expect(resolveReturnTarget(null, "Borrower")).toBe(ROUTES.borrower.root)
  })

  it("returns an accepted target unchanged", () => {
    expect(resolveReturnTarget("/lender/my-markets", "Lender")).toBe(
      "/lender/my-markets",
    )
  })
})

describe("partyRoot", () => {
  it("maps each party to its own root", () => {
    expect(partyRoot("Lender")).toBe(ROUTES.lender.root)
    expect(partyRoot("Borrower")).toBe(ROUTES.borrower.root)
  })
})

describe("readReturnTargetParam", () => {
  it("reads the parameter out of a search string", () => {
    expect(readReturnTargetParam("?returnTo=%2Flender%2Fmy-markets")).toBe(
      "/lender/my-markets",
    )
  })

  it("returns null when the parameter is absent", () => {
    expect(readReturnTargetParam("?other=1")).toBeNull()
  })
})

describe("withReturnTarget", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/")
  })

  it("carries an acceptable origin onto an agreement redirect", () => {
    expect(
      withReturnTarget(ROUTES.lender.agreement, "/lender/my-markets"),
    ).toBe(
      `${ROUTES.lender.agreement}?returnTo=${encodeURIComponent(
        "/lender/my-markets",
      )}`,
    )
  })

  it("leaves a non-agreement redirect alone", () => {
    expect(withReturnTarget("/", "/lender/my-markets")).toBe("/")
  })

  it("preserves the query string on the page being left", () => {
    window.history.replaceState({}, "", "/lender/my-markets?chainId=1")

    expect(
      withReturnTarget(ROUTES.lender.agreement, "/lender/my-markets"),
    ).toBe(
      `${ROUTES.lender.agreement}?returnTo=${encodeURIComponent(
        "/lender/my-markets?chainId=1",
      )}`,
    )
  })

  it("omits a target the consumer would refuse", () => {
    expect(withReturnTarget(ROUTES.lender.agreement, "/admin")).toBe(
      ROUTES.lender.agreement,
    )
  })

  it("omits an agreement route, which would loop", () => {
    expect(
      withReturnTarget(ROUTES.lender.agreement, ROUTES.lender.agreement),
    ).toBe(ROUTES.lender.agreement)
  })
})
