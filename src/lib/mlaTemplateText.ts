import {
  MlaFieldValueKey,
  MlaFieldValueKeys,
  MlaTemplateField,
} from "./mlaFields"

const TOKEN = /\{\{([^{}]+)\}\}/g

const LENDER_PREFIX = "lender."

/// The `{{field}}` placeholders a template text uses, in order of first use.
export const findTemplateTokens = (text: string): string[] =>
  Array.from(new Set(Array.from(text.matchAll(TOKEN), (match) => match[1])))

export const isMlaFieldValueKey = (token: string): token is MlaFieldValueKey =>
  (MlaFieldValueKeys as readonly string[]).includes(token)

export const isLenderField = (source: MlaFieldValueKey) =>
  source.startsWith(LENDER_PREFIX)

/// Text made safe to place in HTML, in element content or a quoted attribute.
export const escapeHtml = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")

/// HTML for an agreement entered as plain text: blank lines separate
/// paragraphs, single line breaks are kept, and nothing in the text is
/// interpreted as markup. `{{field}}` placeholders pass through unchanged.
export const plaintextToHtml = (plaintext: string): string => {
  const paragraphs = plaintext
    .replaceAll("\r\n", "\n")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p>${escapeHtml(paragraph).replaceAll("\n", "<br />")}</p>`,
    )
  return [
    "<!DOCTYPE html>",
    '<html><head><meta charset="utf-8" /></head>',
    '<body style="font-family: Georgia, serif; line-height: 1.5; max-width: 760px; margin: 0 auto;">',
    ...paragraphs,
    "</body></html>",
  ].join("\n")
}

/// A custom MLA is the borrower's agreement text, pasted verbatim, followed by
/// a fixed execution block that names the borrower, the market and the lender.
/// The block is the only part filled in at signing: the borrower's details when
/// the market is created, the lender's when each lender signs.
const CUSTOM_MLA_BORROWER_FIELDS: MlaTemplateField[] = [
  { source: "borrower.name", placeholder: "Borrower Name" },
  { source: "borrower.address", placeholder: "Borrower Address" },
  { source: "borrower.timeSigned", placeholder: "Borrower Signing Date" },
  { source: "market.name", placeholder: "Market Name" },
  { source: "market.address", placeholder: "Market Address" },
  { source: "network.name", placeholder: "Network" },
]

const CUSTOM_MLA_LENDER_FIELDS: MlaTemplateField[] = [
  { source: "lender.address", placeholder: "Lender Address" },
  { source: "lender.timeSigned", placeholder: "Date Signed" },
]

const EXECUTION_BLOCK_TITLE = "Execution details"
const EXECUTION_BLOCK_LINES = [
  "Borrower: {{borrower.name}} ({{borrower.address}}), signed {{borrower.timeSigned}}",
  "Market: {{market.name}} ({{market.address}}) on {{network.name}}",
  "Lender: {{lender.address}}, signed {{lender.timeSigned}}",
]

/// Whether pasted text contains `{{`, which a stored template reserves for
/// the execution block; such text is refused so it is signed exactly as pasted.
export const hasTemplateBraces = (text: string) => text.includes("{{")

/// The stored template for a pasted agreement text. The text keeps its words
/// and line breaks; only line endings are normalised and trailing blank lines
/// dropped before the execution block.
export const buildCustomMlaTemplate = (text: string) => {
  const agreement = text.replaceAll("\r\n", "\n").replace(/\s+$/, "")
  const plaintext = [
    agreement,
    "",
    EXECUTION_BLOCK_TITLE,
    ...EXECUTION_BLOCK_LINES,
  ].join("\n")
  const blockHtml = [
    '<div style="border-top: 1px solid #ccc; margin-top: 24px; padding-top: 12px; font-family: Arial, sans-serif; font-size: 13px;">',
    `<p><strong>${EXECUTION_BLOCK_TITLE}</strong><br />${EXECUTION_BLOCK_LINES.join(
      "<br />",
    )}</p>`,
    "</div>",
  ].join("\n")
  return {
    plaintext,
    html: plaintextToHtml(agreement).replace(
      "</body></html>",
      `${blockHtml}\n</body></html>`,
    ),
    borrowerFields: CUSTOM_MLA_BORROWER_FIELDS,
    lenderFields: CUSTOM_MLA_LENDER_FIELDS,
  }
}

/// A stored agreement's HTML with each lender field shown as its bracketed
/// placeholder, as everyone sees it before a lender signs.
export const fillLenderPlaceholders = (
  html: string,
  lenderFields: MlaTemplateField[],
) =>
  lenderFields.reduce(
    (filled, { source, placeholder }) =>
      filled.replaceAll(`{{${source}}}`, escapeHtml(`[${placeholder}]`)),
    html,
  )

/// A template's HTML with every field shown as its bracketed placeholder, as an
/// admin sees it before any borrower or lender has signed. Placeholders are
/// stored bare; the app adds the brackets wherever it shows them.
export const fillWithPlaceholders = ({
  html,
  borrowerFields,
  lenderFields,
}: {
  html: string
  borrowerFields: MlaTemplateField[]
  lenderFields: MlaTemplateField[]
}) =>
  [...borrowerFields, ...lenderFields].reduce(
    (filled, { source, placeholder }) =>
      filled.replaceAll(`{{${source}}}`, escapeHtml(`[${placeholder}]`)),
    html,
  )

/// Problems that would leave a placeholder unfilled in a signed agreement.
/// Empty when the template is consistent.
export const validateTemplateFields = ({
  plaintext,
  html,
  borrowerFields,
  lenderFields,
}: {
  plaintext: string
  html: string
  borrowerFields: MlaTemplateField[]
  lenderFields: MlaTemplateField[]
}): string[] => {
  const problems: string[] = []
  const listed = new Set<string>()
  borrowerFields.forEach(({ source }) => {
    if (isLenderField(source)) {
      problems.push(`{{${source}}} is a lender field, not a borrower field`)
    }
    if (listed.has(source)) problems.push(`{{${source}}} is listed twice`)
    listed.add(source)
  })
  lenderFields.forEach(({ source }) => {
    if (!isLenderField(source)) {
      problems.push(`{{${source}}} is a borrower field, not a lender field`)
    }
    if (listed.has(source)) problems.push(`{{${source}}} is listed twice`)
    listed.add(source)
  })
  findTemplateTokens(`${plaintext}\n${html}`).forEach((token) => {
    if (!isMlaFieldValueKey(token)) {
      problems.push(`{{${token}}} is not a known field`)
    } else if (!listed.has(token)) {
      problems.push(
        `{{${token}}} is used in the text but not listed as a field`,
      )
    }
  })
  return problems
}
