import {
  MLA_FIELD_PLACEHOLDERS,
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

type TemplateText = { plaintext: string; html: string }

type TemplateFields = {
  borrowerFields: MlaTemplateField[]
  lenderFields: MlaTemplateField[]
}

/// A template text as stored: without a byte-order mark, with Unix line
/// endings and no surrounding blank lines.
const normaliseTemplateText = (text: string) =>
  text
    .replace(/^\uFEFF/, "")
    .replaceAll("\r\n", "\n")
    .trim()

/// The fields a template's text uses, worked out from its placeholders: the
/// lender's are filled when each lender signs, the rest at market creation.
/// Each takes the placeholder the source template (the network class's
/// market MLA) gives it, so both read alike before they are filled.
export const deriveTemplateFields = (
  { plaintext, html }: TemplateText,
  placeholderSource?: TemplateFields,
): TemplateFields => {
  const known = new Map(
    [
      ...(placeholderSource?.borrowerFields ?? []),
      ...(placeholderSource?.lenderFields ?? []),
    ].map(({ source, placeholder }) => [source, placeholder]),
  )
  const fields = findTemplateTokens(`${plaintext}\n${html}`)
    .filter(isMlaFieldValueKey)
    .map((source) => ({
      source,
      placeholder: known.get(source) ?? MLA_FIELD_PLACEHOLDERS[source],
    }))
  return {
    borrowerFields: fields.filter(({ source }) => !isLenderField(source)),
    lenderFields: fields.filter(({ source }) => isLenderField(source)),
  }
}

/// Placeholders that write the same value another way. The market MLA's HTML
/// dates itself "this 20th day of November 2026" where its plain text says
/// "this 20 November 2026": both are the lender's signing date.
const SAME_VALUE_AS: Record<string, string> = {
  "lender.timeSignedDayOrdinal": "lender.timeSigned",
  "lender.timeSignedMonthYear": "lender.timeSigned",
}

const valueOf = (token: string) => SAME_VALUE_AS[token] ?? token

/// Placeholders only one of the two texts uses. Lenders read the HTML but
/// sign the plain text, so both must fill in the same values; a value may be
/// written differently in each.
export const compareTemplateTokens = ({
  plaintext,
  html,
}: TemplateText): string[] => {
  const inText = findTemplateTokens(plaintext)
  const inHtml = findTemplateTokens(html)
  const textValues = inText.map(valueOf)
  const htmlValues = inHtml.map(valueOf)
  return [
    ...inText
      .filter((token) => !htmlValues.includes(valueOf(token)))
      .map((token) => `{{${token}}} is in the plain text but not the HTML`),
    ...inHtml
      .filter((token) => !textValues.includes(valueOf(token)))
      .map((token) => `{{${token}}} is in the HTML but not the plain text`),
  ]
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

/// The template a custom MLA is registered as, from the HTML and plain text
/// of the borrower's copy of a stored MLA, with the problems that would stop
/// it filling in like the market MLA.
export const prepareCustomMlaTemplate = (
  texts: TemplateText,
  placeholderSource?: TemplateFields,
) => {
  const plaintext = normaliseTemplateText(texts.plaintext)
  const html = normaliseTemplateText(texts.html)
  const template = {
    plaintext,
    html,
    ...deriveTemplateFields({ plaintext, html }, placeholderSource),
  }
  const problems = [
    ...(/<[a-z][^>]*>/i.test(html) ? [] : ["The HTML has no markup"]),
    ...(/<(html|body)[\s>]/i.test(plaintext) ? ["The plain text is HTML"] : []),
    ...compareTemplateTokens(template),
    ...validateTemplateFields(template),
  ]
  return { template, problems }
}
