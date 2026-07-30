import { keccak256, stringToHex } from "viem"

import { ACCEPT_MLA_MESSAGE } from "@/config/mla-acceptance"
import type { MlaFieldValueKey, MlaTemplateField } from "@/lib/mla"
import { formatAddress, formatDate } from "@/lib/mlaFormatters"

type LenderKeys =
  | "lender.timeSigned"
  | "lender.timeSignedDayOrdinal"
  | "lender.timeSignedMonthYear"
  | "lender.address"

type BorrowerSignedMla = {
  // HTML after filling in all borrower fields
  html: string
  // Plaintext after filling in all borrower fields
  plaintext: string
  lenderFields: MlaTemplateField[]
}

const nth = (d: number) => {
  const dString = String(d)
  const last = +dString.slice(-2)
  if (last > 3 && last < 21) return "th"
  switch (last % 10) {
    case 1:
      return "st"
    case 2:
      return "nd"
    case 3:
      return "rd"
    default:
      return "th"
  }
}

export function getFieldValuesForLender(
  lenderAddress: string,
  lenderTimeSigned: number,
) {
  const date = new Date(lenderTimeSigned)
  const utcDate = date.getUTCDate()
  const data: Map<LenderKeys, string | undefined> = new Map([
    ["lender.timeSigned", formatDate(lenderTimeSigned)],
    ["lender.timeSignedDayOrdinal", `${utcDate}${nth(utcDate)}`],
    [
      "lender.timeSignedMonthYear",
      date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }),
    ],
    ["lender.address", formatAddress(lenderAddress)],
  ])
  return data
}

export function fillInMlaForLender(
  mla: BorrowerSignedMla,
  values: Map<MlaFieldValueKey, string | undefined>,
  marketAddress: string,
) {
  let { html, plaintext } = mla
  mla.lenderFields.forEach((field) => {
    const value = values.get(field.source) ?? field.placeholder
    plaintext = plaintext.replaceAll(`{{${field.source}}}`, value)
    html = html.replaceAll(`{{${field.source}}}`, value)
  })
  const message = ACCEPT_MLA_MESSAGE.replace(
    "{{market}}",
    formatAddress(marketAddress) as string,
  ).replace("{{hash}}", keccak256(stringToHex(plaintext)))

  return { html, plaintext, message }
}
