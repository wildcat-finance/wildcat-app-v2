/** @jest-environment node */
import {
  carryTextEdits,
  findTextMissingFromHtml,
  normaliseParagraph,
  parseHtmlParagraphs,
  prettifyHtmlBody,
  splitHtmlBody,
} from "./mlaTextSync"

// Shaped like a Google Docs export: a defined term in its own bold run, curly
// quotes as entities, clause numbers drawn by CSS, a table for the terms and
// a line break inside a paragraph.
const HTML = [
  '<html><head><style>.c1{font-weight:700}</style><title>MLA</title></head><body class="doc">',
  '<p class="c0"><span class="c2">MASTER LOAN AGREEMENT</span></p>',
  '<p class="c0"><span class="c2">&ldquo;</span><span class="c1">Market</span><span class="c2">&rdquo; means the market that the Borrower has&nbsp;deployed.</span></p>',
  '<ol class="lst-kix_a-0"><li class="c3"><span class="c2">Interest accrues at {{market.apr}} a year.</span></li>',
  '<li class="c3"><span class="c2">Governing law is England and Wales.</span></li></ol>',
  '<table><tr><td><p><span class="c4">Base APR:</span></p></td><td><p><span class="c2">{{market.apr}}</span></p></td></tr></table>',
  '<p class="c0"><span class="c2">Signed.</span><br><span class="c2">Signed.</span></p>',
  "</body></html>",
].join("")

// The same agreement as its plain text writes it.
const TEXT = [
  "MASTER LOAN AGREEMENT",
  "",
  "`Market` means the market that the Borrower has deployed.",
  "",
  "1. Interest accrues at {{market.apr}} a year.",
  "2. Governing law is England and Wales.",
  "",
  "Base APR: {{market.apr}}",
  "Signed.",
  "Signed.",
].join("\n")

const carry = (toText: string, html = HTML, fromText = TEXT) =>
  carryTextEdits(html, parseHtmlParagraphs(html), fromText, toText)

const edit = (from: string, to: string) => TEXT.replace(from, to)

describe("normaliseParagraph", () => {
  it("drops clause numbers and bullets, and evens out quotes and spaces", () => {
    expect(normaliseParagraph("1. Interest").text).toBe("Interest")
    expect(normaliseParagraph("(a)\tInterest").text).toBe("Interest")
    expect(normaliseParagraph("12.3 Interest").text).toBe("Interest")
    expect(normaliseParagraph("iv) Interest").text).toBe("Interest")
    expect(normaliseParagraph("* Interest").text).toBe("Interest")
    expect(normaliseParagraph("`Market`  means\n it").text).toBe(
      '"Market" means it',
    )
    expect(normaliseParagraph("I agree").text).toBe("I agree")
  })

  it("maps each character back to the original", () => {
    const { text, map } = normaliseParagraph("2.  Pay  `now`  ")
    expect(text).toBe('Pay "now"')
    expect(map).toEqual([4, 5, 6, 7, 9, 10, 11, 12, 13, 14])
  })
})

describe("parseHtmlParagraphs", () => {
  it("reads the paragraphs a reader sees, table rows as one line", () => {
    expect(
      parseHtmlParagraphs(HTML).map(
        ({ text }) => normaliseParagraph(text).text,
      ),
    ).toEqual([
      "MASTER LOAN AGREEMENT",
      '"Market" means the market that the Borrower has deployed.',
      "Interest accrues at {{market.apr}} a year.",
      "Governing law is England and Wales.",
      "Base APR: {{market.apr}}",
      "Signed.",
      "Signed.",
    ])
  })
})

describe("carryTextEdits", () => {
  it("leaves the HTML alone when the words have not changed", () => {
    expect(carry(TEXT)).toEqual({ html: HTML, unplaced: [] })
    // The HTML draws clause numbers itself.
    expect(carry(edit("2. Governing", "3. Governing"))).toEqual({
      html: HTML,
      unplaced: [],
    })
  })

  it("changes a paragraph in place, keeping its markup", () => {
    const { html, unplaced } = carry(edit("England and Wales", "Singapore"))
    expect(unplaced).toEqual([])
    expect(html).toBe(
      HTML.replace(
        "Governing law is England and Wales.",
        "Governing law is Singapore.",
      ),
    )
  })

  it("finds a paragraph whose quotes and spaces are written differently", () => {
    const { html } = carry(edit("has deployed.", "has deployed on Sepolia."))
    expect(html).toContain(
      '<span class="c2">&rdquo; means the market that the Borrower has&nbsp;deployed on Sepolia.</span>',
    )
  })

  it("changes a table cell", () => {
    const { html } = carry(edit("Base APR:", "Base Interest Rate:"))
    expect(html).toContain('<span class="c4">Base Interest Rate:</span>')
  })

  it("changes the right one of two identical paragraphs", () => {
    const { html } = carry(`${TEXT.slice(0, -"Signed.".length)}Signed by both.`)
    expect(html).toContain(
      '<span class="c2">Signed.</span><br><span class="c2">Signed by both.</span>',
    )
  })

  it("writes typed markup characters as text", () => {
    const { html } = carry(edit("a year.", "a year & <more>."))
    expect(html).toContain("a year &amp; &lt;more&gt;.")
  })

  it("removes a deleted paragraph's element", () => {
    const { html, unplaced } = carry(
      edit("2. Governing law is England and Wales.\n", ""),
    )
    expect(unplaced).toEqual([])
    expect(html).not.toContain("Governing law")
    expect(html).toContain("a year.</span></li></ol>")
  })

  it("lists what it cannot place: new paragraphs and edits across styled text", () => {
    const added = carry(
      edit("Base APR:", "3. Notices go by email.\n\nBase APR:"),
    )
    expect(added.unplaced).toEqual([
      { kind: "add", text: "3. Notices go by email." },
    ])
    expect(added.html).toBe(HTML)

    const crossing = carry(edit("`Market` means", "`Pool` is"))
    expect(crossing.unplaced).toEqual([
      {
        kind: "change",
        text: "`Pool` is the market that the Borrower has deployed.",
      },
    ])
  })

  it("lists a deleted paragraph it cannot find, or cannot remove whole", () => {
    expect(
      carry(
        TEXT.replace("MASTER LOAN AGREEMENT\n", ""),
        HTML.replace("MASTER", "MAIN"),
      ).unplaced,
    ).toEqual([{ kind: "remove", text: "MASTER LOAN AGREEMENT" }])
    // The two lines share one element, split by a line break.
    const shared = carry(TEXT.replace("Signed.\nSigned.", "Signed."))
    expect(shared.unplaced).toEqual([{ kind: "remove", text: "Signed." }])
    expect(shared.html).toBe(HTML)
  })
})

describe("findTextMissingFromHtml", () => {
  it("lists paragraphs of the text the HTML does not have", () => {
    expect(findTextMissingFromHtml(HTML, TEXT)).toEqual([])
    expect(
      findTextMissingFromHtml(HTML, `${TEXT}\nSigned.\nNotices go by email.`),
    ).toEqual([
      { words: "Signed.", line: "Signed." },
      { words: "Notices go by email.", line: "Notices go by email." },
    ])
  })
})

describe("prettifyHtmlBody", () => {
  it("puts each block of the body on its own line, once", () => {
    const pretty = prettifyHtmlBody(HTML)
    const { head, body } = splitHtmlBody(pretty)
    expect(head).toBe(splitHtmlBody(HTML).head)
    expect(body).toContain('\n<p class="c0"><span class="c2">MASTER')
    expect(body).toContain('\n<li class="c3">')
    expect(prettifyHtmlBody(pretty)).toBe(pretty)
    expect(
      parseHtmlParagraphs(pretty).map(
        ({ text }) => normaliseParagraph(text).text,
      ),
    ).toEqual(
      parseHtmlParagraphs(HTML).map(
        ({ text }) => normaliseParagraph(text).text,
      ),
    )
  })

  it("treats a document without a body element as all body", () => {
    expect(splitHtmlBody("<p>Hi</p>")).toEqual({
      head: "",
      body: "<p>Hi</p>",
      tail: "",
    })
  })
})
