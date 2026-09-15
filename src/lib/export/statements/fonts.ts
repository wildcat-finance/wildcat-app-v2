import { readFile } from "node:fs/promises"
import path from "node:path"

import fontkit from "@pdf-lib/fontkit"
import { PDFDocument, PDFFont, PDFPage, PDFPageDrawTextOptions } from "pdf-lib"

const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" })
export const pdfGraphemes = (text: string) =>
  Array.from(segmenter.segment(text), ({ segment }) => segment)

const fontFiles = {
  regular: "NotoSans-Regular.ttf",
  bold: "NotoSans-Bold.ttf",
  emoji: "NotoEmoji.ttf",
  cjk: "NotoSansCJKjp-Regular.ttf",
} as const
type FontName = keyof typeof fontFiles
const fontData = new Map<
  FontName,
  Promise<{ bytes: Buffer; characters: Set<number> }>
>()

const loadFont = (name: FontName) => {
  let data = fontData.get(name)
  if (!data) {
    data = readFile(
      path.join(
        process.cwd(),
        "src/lib/export/statements/fonts",
        fontFiles[name],
      ),
    ).then((bytes) => ({
      bytes,
      characters: new Set(fontkit.create(bytes).characterSet),
    }))
    fontData.set(name, data)
  }
  return data
}

const covers = (characters: Set<number>, grapheme: string) =>
  Array.from(grapheme).every((character) =>
    characters.has(character.codePointAt(0)!),
  )

const textFont = (primary: PDFFont, alternatives: Map<string, PDFFont>) => {
  const runs = (text: string) => {
    const result: { text: string; font: PDFFont }[] = []
    pdfGraphemes(text).forEach((grapheme) => {
      const font = alternatives.get(grapheme) ?? primary
      const previous = result[result.length - 1]
      if (previous?.font === font) previous.text += grapheme
      else result.push({ text: grapheme, font })
    })
    return result
  }
  return {
    widthOfTextAtSize: (text: string, size: number) =>
      runs(text).reduce(
        (width, run) => width + run.font.widthOfTextAtSize(run.text, size),
        0,
      ),
    drawText: (
      page: PDFPage,
      text: string,
      options: PDFPageDrawTextOptions & { x: number; size: number },
    ) => {
      let { x } = options
      runs(text).forEach((run) => {
        page.drawText(run.text, { ...options, x, font: run.font })
        x += run.font.widthOfTextAtSize(run.text, options.size)
      })
    },
  }
}

export type PdfTextFont = ReturnType<typeof textFont>

/** Embed only the fonts needed by this statement, with complete grapheme runs. */
export async function createStatementFonts(
  document: PDFDocument,
  text: string,
) {
  document.registerFontkit(fontkit)
  const [regularData, boldData] = await Promise.all([
    loadFont("regular"),
    loadFont("bold"),
  ])
  const regular = await document.embedFont(regularData.bytes, { subset: true })
  const bold = await document.embedFont(boldData.bytes, { subset: true })
  const missing = new Set(
    pdfGraphemes(text).filter(
      (grapheme) =>
        !covers(regularData.characters, grapheme) ||
        !covers(boldData.characters, grapheme),
    ),
  )
  const alternatives = new Map<string, PDFFont>()
  // Emoji first keeps emoji-only statements from loading the much larger CJK font.
  // eslint-disable-next-line no-restricted-syntax
  for (const name of ["emoji", "cjk"] as const) {
    if (missing.size === 0) break
    // eslint-disable-next-line no-await-in-loop
    const data = await loadFont(name)
    const supported = [...missing].filter((grapheme) =>
      covers(data.characters, grapheme),
    )
    if (supported.length > 0) {
      // eslint-disable-next-line no-await-in-loop
      const font = await document.embedFont(data.bytes, { subset: true })
      supported.forEach((grapheme) => {
        alternatives.set(grapheme, font)
        missing.delete(grapheme)
      })
    }
  }
  if (missing.size > 0) {
    const characters = Array.from(
      [...missing][0],
      (character) =>
        `U+${character.codePointAt(0)!.toString(16).toUpperCase()}`,
    ).join(" ")
    throw new Error(`Statement fonts do not support ${characters}`)
  }
  return {
    regular: textFont(regular, alternatives),
    bold: textFont(bold, alternatives),
  }
}
