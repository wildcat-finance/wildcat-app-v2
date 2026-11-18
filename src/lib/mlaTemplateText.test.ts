/** @jest-environment node */
import { dummyCustomMla } from "@/app/api/mla/__fixtures__/dummyCustomMla"

import {
  deriveTemplateFields,
  findTemplateTokens,
  plaintextToHtml,
  validateTemplateFields,
} from "./mlaTemplateText"

describe("findTemplateTokens", () => {
  it("lists each placeholder once, in order of first use", () => {
    expect(
      findTemplateTokens("{{a.b}} and {{c}} then {{a.b}} { {x} } {{}}"),
    ).toEqual(["a.b", "c"])
  })
})

describe("plaintextToHtml", () => {
  it("escapes markup and keeps paragraphs, line breaks and placeholders", () => {
    const html = plaintextToHtml(
      "Party <script>alert(1)</script> & co\nline two\n\nSecond {{borrower.name}}",
    )
    expect(html).toContain(
      "<p>Party &lt;script&gt;alert(1)&lt;/script&gt; &amp; co<br />line two</p>",
    )
    expect(html).toContain("<p>Second {{borrower.name}}</p>")
    expect(html).not.toContain("<script>")
  })
})

describe("validateTemplateFields", () => {
  it("accepts the dummy custom MLA fixture", () => {
    expect(
      validateTemplateFields({
        ...dummyCustomMla,
        html: plaintextToHtml(dummyCustomMla.plaintext),
      }),
    ).toEqual([])
  })

  it("reports placeholders that would stay unfilled in a signed agreement", () => {
    expect(
      validateTemplateFields({
        plaintext: "{{borrower.name}} {{unknown.field}} {{market.apr}}",
        html: "<p>{{lender.address}}</p>",
        borrowerFields: [
          { source: "borrower.name", placeholder: "" },
          { source: "lender.timeSigned", placeholder: "" },
        ],
        lenderFields: [{ source: "market.capacity", placeholder: "" }],
      }),
    ).toEqual([
      "{{lender.timeSigned}} is a lender field, not a borrower field",
      "{{market.capacity}} is a borrower field, not a lender field",
      "{{unknown.field}} is not a known field",
      "{{market.apr}} is used in the text but not listed as a field",
      "{{lender.address}} is used in the text but not listed as a field",
    ])
  })
})

describe("deriveTemplateFields", () => {
  it("splits placeholders into borrower and lender fields and keeps known placeholders", () => {
    expect(
      deriveTemplateFields(
        ["{{borrower.name}} {{lender.address}} {{nope}}", "{{market.apr}}"],
        [{ source: "borrower.name", placeholder: "[Name]" }],
      ),
    ).toEqual({
      borrowerFields: [
        { source: "borrower.name", placeholder: "[Name]" },
        { source: "market.apr", placeholder: "[market.apr]" },
      ],
      lenderFields: [
        { source: "lender.address", placeholder: "[lender.address]" },
      ],
    })
  })
})
