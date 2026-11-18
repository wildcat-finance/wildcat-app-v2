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

const escapeHtml = (text: string) =>
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

/// Fields for every placeholder in the texts: lender placeholders become lender
/// fields, the rest borrower fields. Existing placeholders of a field are kept.
export const deriveTemplateFields = (
  texts: string[],
  existing: MlaTemplateField[] = [],
): { borrowerFields: MlaTemplateField[]; lenderFields: MlaTemplateField[] } => {
  const placeholders = new Map(
    existing.map(({ source, placeholder }) => [source, placeholder]),
  )
  const sources = findTemplateTokens(texts.join("\n")).filter(
    isMlaFieldValueKey,
  )
  const fields = sources.map((source) => ({
    source,
    placeholder: placeholders.get(source) ?? `[${source}]`,
  }))
  return {
    borrowerFields: fields.filter(({ source }) => !isLenderField(source)),
    lenderFields: fields.filter(({ source }) => isLenderField(source)),
  }
}

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
