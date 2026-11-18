/** @jest-environment node */
import { dummyCustomMla } from "@/app/api/mla/__fixtures__/dummyCustomMla"

import { fillInMlaForLender, fillInMlaTemplate } from "./mla"
import {
  buildCustomMlaTemplate,
  fillWithPlaceholders,
  findTemplateTokens,
  hasTemplateBraces,
  plaintextToHtml,
  validateTemplateFields,
} from "./mlaTemplateText"

const MARKET = "0x1111111111111111111111111111111111111111"
const LENDER = "0x2222222222222222222222222222222222222222"

describe("findTemplateTokens", () => {
  it("lists each placeholder once, in order of first use", () => {
    expect(
      findTemplateTokens("{{a.b}} and {{c}} then {{a.b}} { {x} } {{}}"),
    ).toEqual(["a.b", "c"])
  })
})

describe("plaintextToHtml", () => {
  it("escapes markup and keeps paragraphs and line breaks", () => {
    const html = plaintextToHtml(
      "Party <script>alert(1)</script> & co\nline two\n\nSecond paragraph",
    )
    expect(html).toContain(
      "<p>Party &lt;script&gt;alert(1)&lt;/script&gt; &amp; co<br />line two</p>",
    )
    expect(html).toContain("<p>Second paragraph</p>")
    expect(html).not.toContain("<script>")
  })
})

describe("buildCustomMlaTemplate", () => {
  const template = buildCustomMlaTemplate(`${dummyCustomMla.text}\r\n\r\n`)

  it("keeps the pasted text word for word and adds the execution block", () => {
    expect(template.plaintext.startsWith(dummyCustomMla.text)).toBe(true)
    expect(template.plaintext.slice(dummyCustomMla.text.length)).toBe(
      [
        "",
        "",
        "Execution details",
        "Borrower: {{borrower.name}} ({{borrower.address}}), signed {{borrower.timeSigned}}",
        "Market: {{market.name}} ({{market.address}}) on {{network.name}}",
        "Lender: {{lender.address}}, signed {{lender.timeSigned}}",
      ].join("\n"),
    )
  })

  it("lists exactly the fields its execution block uses", () => {
    expect(validateTemplateFields(template)).toEqual([])
    expect(template.lenderFields.map(({ source }) => source)).toEqual([
      "lender.address",
      "lender.timeSigned",
    ])
  })

  it("fills the borrower's details at market creation and the lender's when they sign", () => {
    const borrowerCopy = fillInMlaTemplate(
      template,
      new Map([
        ["borrower.name", "Lemon Ltd"],
        ["market.address", MARKET],
      ]),
    )
    expect(borrowerCopy.plaintext).toContain("Borrower: Lemon Ltd (")
    expect(borrowerCopy.plaintext).toContain(
      "Lender: {{lender.address}}, signed {{lender.timeSigned}}",
    )
    const lenderCopy = fillInMlaForLender(
      { ...borrowerCopy, lenderFields: template.lenderFields },
      new Map([
        ["lender.address", LENDER],
        ["lender.timeSigned", "20 November 2026"],
      ]),
      MARKET,
    )
    expect(lenderCopy.plaintext).toContain(
      `Lender: ${LENDER}, signed 20 November 2026`,
    )
    expect(lenderCopy.plaintext.startsWith(dummyCustomMla.text)).toBe(true)
  })

  it("shows placeholders in the admin preview", () => {
    const preview = fillWithPlaceholders(template)
    expect(preview).toContain("Lender: [Lender Address], signed [Date Signed]")
    expect(preview).not.toContain("{{")
  })
})

it("reserves {{ for the execution block", () => {
  expect(hasTemplateBraces("Pay {{amount}}")).toBe(true)
  expect(hasTemplateBraces("Pay { amount }")).toBe(false)
})
