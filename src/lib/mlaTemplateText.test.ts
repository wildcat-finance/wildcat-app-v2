/** @jest-environment node */
import { dummyCustomMla } from "@/app/api/mla/__fixtures__/dummyCustomMla"

import { fillInMlaForLender, fillInMlaTemplate } from "./mla"
import {
  compareTemplateTokens,
  deriveTemplateFields,
  fillWithPlaceholders,
  findTemplateTokens,
  plaintextToHtml,
  prepareCustomMlaTemplate,
} from "./mlaTemplateText"

const MARKET = "0x1111111111111111111111111111111111111111"
const LENDER = "0x2222222222222222222222222222222222222222"
const BOM = "\uFEFF"

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

describe("custom MLA texts", () => {
  const marketMla = {
    borrowerFields: [
      { source: "market.apr" as const, placeholder: "Annual Interest Rate" },
    ],
    lenderFields: [
      { source: "lender.address" as const, placeholder: "Lender Wallet" },
    ],
  }

  it("works out the fields from the placeholders, labelled as the market MLA labels them", () => {
    expect(deriveTemplateFields(dummyCustomMla, marketMla)).toEqual({
      borrowerFields: [
        { source: "borrower.name", placeholder: "Borrower Name" },
        { source: "market.address", placeholder: "Market Address" },
        { source: "market.apr", placeholder: "Annual Interest Rate" },
        {
          source: "market.withdrawalBatchDuration",
          placeholder: "Withdrawal Cycle",
        },
      ],
      lenderFields: [
        { source: "lender.timeSigned", placeholder: "Date Signed" },
        { source: "lender.address", placeholder: "Lender Wallet" },
      ],
    })
  })

  it("stores the texts as entered, without a byte-order mark or Windows line endings", () => {
    const { template, problems } = prepareCustomMlaTemplate({
      html: `${BOM}${dummyCustomMla.html}\r\n`,
      plaintext: `${BOM}${dummyCustomMla.plaintext.replaceAll(
        "\n",
        "\r\n",
      )}\r\n`,
    })
    expect(problems).toEqual([])
    expect(template.plaintext).toBe(dummyCustomMla.plaintext)
    expect(template.html).toBe(dummyCustomMla.html)
  })

  it("refuses texts that would not fill in the same values", () => {
    const { problems } = prepareCustomMlaTemplate({
      html: `${dummyCustomMla.html}<p>{{market.capacity}}</p>`,
      plaintext: `${dummyCustomMla.plaintext}\n{{market.reserveRatio}} {{market.ap}}`,
    })
    expect(problems).toEqual([
      "{{market.reserveRatio}} is in the plain text but not the HTML",
      "{{market.ap}} is in the plain text but not the HTML",
      "{{market.capacity}} is in the HTML but not the plain text",
      "{{market.ap}} is not a known field",
    ])
    expect(
      compareTemplateTokens({
        html: "<p>{{market.<span>apr}}</span></p>",
        plaintext: "{{market.apr}}",
      }),
    ).toEqual([
      "{{market.apr}} is in the plain text but not the HTML",
      "{{market.<span>apr}} is in the HTML but not the plain text",
    ])
  })

  it("accepts the lender's signing date written differently in each text, as the market MLA does", () => {
    expect(
      compareTemplateTokens({
        html: "<p>Made on this {{lender.timeSignedDayOrdinal}} day of {{lender.timeSignedMonthYear}}.</p>",
        plaintext: "Made on this {{lender.timeSigned}}.",
      }),
    ).toEqual([])
    expect(
      compareTemplateTokens({
        html: "<p>Made in {{lender.timeSignedMonthYear}}.</p>",
        plaintext: "Made by {{lender.address}}.",
      }),
    ).toEqual([
      "{{lender.address}} is in the plain text but not the HTML",
      "{{lender.timeSignedMonthYear}} is in the HTML but not the plain text",
    ])
  })

  it("notices the texts entered the wrong way round", () => {
    const { problems } = prepareCustomMlaTemplate({
      html: dummyCustomMla.plaintext,
      plaintext: dummyCustomMla.html,
    })
    expect(problems.slice(0, 2)).toEqual([
      "The HTML has no markup",
      "The plain text is HTML",
    ])
  })

  it("fills in at market creation and lender signing as the market MLA does", () => {
    const { template } = prepareCustomMlaTemplate(dummyCustomMla, marketMla)
    const borrowerCopy = fillInMlaTemplate(
      template,
      new Map([
        ["borrower.name", "Lemon <Ltd>"],
        ["market.address", MARKET],
        ["market.apr", "12%"],
        ["market.withdrawalBatchDuration", "2 days"],
      ]),
    )
    expect(borrowerCopy.plaintext).toContain("Interest accrues at 12% a year")
    expect(borrowerCopy.plaintext).toContain(
      "between Lemon <Ltd> (the Borrower)",
    )
    expect(borrowerCopy.html).toContain(
      "between Lemon &lt;Ltd&gt; (the Borrower)",
    )
    expect(borrowerCopy.plaintext).toContain("wallet {{lender.address}}")
    const lenderCopy = fillInMlaForLender(
      { ...borrowerCopy, lenderFields: template.lenderFields },
      new Map([
        ["lender.address", LENDER],
        ["lender.timeSigned", "20 November 2026"],
      ]),
      MARKET,
    )
    expect(lenderCopy.plaintext).toContain(
      `made on 20 November 2026 between Lemon <Ltd> (the Borrower) and the holder of wallet ${LENDER}`,
    )
    expect(lenderCopy.plaintext).not.toContain("{{")
  })

  it("shows placeholders in the admin preview", () => {
    const { template } = prepareCustomMlaTemplate(dummyCustomMla, marketMla)
    const preview = fillWithPlaceholders(template)
    expect(preview).toContain(
      "Interest accrues at [Annual Interest Rate] a year",
    )
    expect(preview).toContain("holder of wallet [Lender Wallet]")
    expect(preview).not.toContain("{{")
  })
})
