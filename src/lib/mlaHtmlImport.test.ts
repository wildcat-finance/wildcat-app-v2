import { formatCounter, importMlaHtml } from "./mlaHtmlImport"
import { prepareCustomMlaTemplate } from "./mlaTemplateText"
import { findTextMissingFromHtml } from "./mlaTextSync"

// The shape of a Google Docs "Web page (.html)" download: clause numbers are
// CSS counters, each run of a list is its own <ol> with a `start`, and links
// go through a google.com redirect.
const STYLE = [
  "ol.lst-kix_abc-0{list-style-type:none}",
  ".lst-kix_abc-0>li{counter-increment:lst-ctn-kix_abc-0}",
  '.lst-kix_abc-0>li:before{content:"" counter(lst-ctn-kix_abc-0,decimal) ". "}',
  '.lst-kix_abc-1>li:before{content:"(" counter(lst-ctn-kix_abc-1,lower-latin) ") "}',
  '.lst-kix_abc-2>li:before{content:"" counter(lst-ctn-kix_abc-0,decimal) "." counter(lst-ctn-kix_abc-2,lower-roman) " "}',
  '.lst-kix_dot-0>li:before{content:"\\0025cf   "}',
].join("")

const GOOGLE_DOC = `<html><head><meta content="text/html; charset=UTF-8" http-equiv="content-type"><style type="text/css">${STYLE}</style></head><body class="c20 doc-content"><p class="c7"><span class="c9">This Master Loan&nbsp;Agreement (this </span><span class="c2">&ldquo;Agreement&rdquo;</span><span class="c9">) is made on {{lender.timeSigned}}.</span></p><ol class="c3 lst-kix_abc-0 start" start="1"><li class="c7 li-bullet-0"><h2 style="display:inline"><span class="c5">Definitions</span></h2></li></ol><p class="c7"><span class="c9">Interest accrues at {{market.apr}}. See <a class="c4" href="https://www.google.com/url?q=https://docs.wildcat.finance/a%3Fb&amp;sa=D&amp;source=editors&amp;ust=1&amp;usg=x">the docs</a>.</span></p><ol class="c3 lst-kix_abc-0" start="2"><li class="c7 li-bullet-0"><span class="c9">Loans</span></li></ol><ol class="c3 lst-kix_abc-1 start" start="1"><li class="c8 li-bullet-0"><span class="c9">Withdrawals</span></li><li class="c8 li-bullet-0"><span class="c9">Closing</span></li></ol><ol class="c3 lst-kix_abc-2 start" start="4"><li class="c8 li-bullet-0"><span class="c9">Notices</span></li></ol><ul class="c3 lst-kix_dot-0 start"><li class="c8 li-bullet-0"><span class="c9">Each Lender signs separately.</span></li></ul><p class="c7"><span class="c9"></span></p></body></html>`

describe("importMlaHtml", () => {
  it("numbers each clause as Google Docs draws it, in the text to sign", () => {
    const { plaintext } = importMlaHtml(GOOGLE_DOC)
    expect(plaintext.split("\n\n")).toEqual([
      "This Master Loan Agreement (this “Agreement”) is made on {{lender.timeSigned}}.",
      "1. Definitions",
      "Interest accrues at {{market.apr}}. See the docs.",
      "2. Loans",
      "(a) Withdrawals",
      "(b) Closing",
      "2.iv Notices",
      "● Each Lender signs separately.",
    ])
  })

  it("gives the dialog texts that match, with links straight to their targets", () => {
    const { html, plaintext } = importMlaHtml(`\uFEFF${GOOGLE_DOC}\r\n`)
    expect(findTextMissingFromHtml(html, plaintext)).toEqual([])
    expect(prepareCustomMlaTemplate({ html, plaintext }).problems).toEqual([])
    expect(html).toContain('href="https://docs.wildcat.finance/a?b"')
    expect(html).not.toContain("google.com/url")
    expect(html).toContain("<style")
  })

  it("leaves a redirect alone unless it leads to a web page or an email", () => {
    const link =
      '<a href="https://www.google.com/url?q=javascript:alert(1)&amp;sa=D">x</a>'
    expect(importMlaHtml(`<p>${link}</p>`).html).toContain(link)
  })

  it("numbers plain HTML lists the way a browser does", () => {
    const { plaintext } = importMlaHtml(
      '<ol start="3"><li>Third</li><li>Fourth</li></ol><ul><li>Point</li></ul>',
    )
    expect(plaintext.split("\n\n")).toEqual([
      "3. Third",
      "4. Fourth",
      "• Point",
    ])
  })
})

it("writes counters in each list style", () => {
  expect(formatCounter(1, "lower-latin")).toBe("a")
  expect(formatCounter(27, "lower-latin")).toBe("aa")
  expect(formatCounter(4, "lower-roman")).toBe("iv")
  expect(formatCounter(1994, "upper-roman")).toBe("MCMXCIV")
  expect(formatCounter(7, "decimal")).toBe("7")
})
