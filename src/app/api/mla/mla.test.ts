/**
 * @jest-environment node
 */

import { getAddress } from "viem"

import {
  fillInMlaForLender,
  fillInMlaTemplate,
  MlaFieldValueKey,
  MlaTemplateField,
} from "@/lib/mla"

const marketAddress = "0x0000000000000000000000000000000000000001"
const lenderAddress = "0x0000000000000000000000000000000000000002"

describe("mla helpers", () => {
  test("fills borrower template values and derives an acceptance message", () => {
    const borrowerFields: MlaTemplateField[] = [
      {
        source: "market.name",
        placeholder: "Insert Market Name",
      },
      {
        source: "market.address",
        placeholder: "Insert Market Address",
      },
    ]
    const fieldValues = new Map<MlaFieldValueKey, string | undefined>([
      ["market.name", "Sepolia Credit"],
      ["market.address", marketAddress],
    ])

    const result = fillInMlaTemplate(
      {
        html: "<p>{{market.name}}</p><p>{{market.address}}</p>",
        plaintext: "market {{market.name}} at {{market.address}}",
        borrowerFields,
        lenderFields: [],
      },
      fieldValues,
    )

    expect(result.html).toBe(`<p>Sepolia Credit</p><p>${marketAddress}</p>`)
    expect(result.plaintext).toBe(`market Sepolia Credit at ${marketAddress}`)
    expect(result.message).toContain(getAddress(marketAddress))
    expect(result.message).not.toContain("{{hash}}")
  })

  test("fills lender fields while preserving borrower-filled content", () => {
    const result = fillInMlaForLender(
      {
        html: "<p>borrower terms</p><p>{{lender.address}}</p>",
        plaintext: "borrower terms\n{{lender.address}}",
        lenderFields: [
          {
            source: "lender.address",
            placeholder: "Insert Lender Address",
          },
        ],
      },
      new Map<MlaFieldValueKey, string | undefined>([
        ["lender.address", lenderAddress],
      ]),
      marketAddress,
    )

    expect(result.html).toBe(`<p>borrower terms</p><p>${lenderAddress}</p>`)
    expect(result.plaintext).toBe(`borrower terms\n${lenderAddress}`)
    expect(result.message).toContain(getAddress(marketAddress))
    expect(result.message).not.toContain("{{hash}}")
  })
})
