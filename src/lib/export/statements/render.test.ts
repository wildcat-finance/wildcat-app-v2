/** @jest-environment node */

import fontkit from "@pdf-lib/fontkit"
import {
  decodePDFRawStream,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRawStream,
} from "pdf-lib"

import { pdfGraphemes } from "./fonts"
import { renderPdf, StatementModel } from "./render"

const model: StatementModel = {
  title: "日本市場 🚀",
  metadata: [["Market", "東京 – 中文 – 한글"]],
  lead: "Deposits: 123.45 USDC · Résumé · Ж",
  sections: [
    {
      title: "Activity ❤️",
      blocks: [
        { type: "paragraph", text: "👩🏽‍💻 ".repeat(40) },
        {
          type: "table",
          headers: ["Token", "Amount"],
          rows: [["日本市場".repeat(30), "1.000000 🐈"]],
        },
      ],
    },
  ],
  definitions: [["USDC", "Asset symbol"]],
}

describe("PDF statement fonts", () => {
  it("embeds readable Unicode text and compact deterministic font subsets", async () => {
    const first = await renderPdf(model, 1_800_000_000)
    expect(first).toEqual(await renderPdf(model, 1_800_000_000))
    expect(first.byteLength).toBeLessThan(250_000)
    const pdf = await PDFDocument.load(first)
    const fontDescriptors = pdf.context
      .enumerateIndirectObjects()
      .map(([, object]) => object)
      .filter(
        (object): object is PDFDict =>
          object instanceof PDFDict &&
          object.get(PDFName.of("Type")) === PDFName.of("FontDescriptor"),
      )
    expect(fontDescriptors).toHaveLength(4)
    fontDescriptors.forEach((descriptor) => {
      const fontStream = descriptor.lookup(
        PDFName.of("FontFile2"),
      ) as PDFRawStream
      const font = fontkit.create(decodePDFRawStream(fontStream).decode())
      // Every subset glyph must decode. A Unicode cmap alone cannot detect
      // corrupt outlines or truncated offsets in an embedded font.
      for (let glyph = 0; glyph < font.numGlyphs; glyph += 1) {
        expect(() => font.getGlyph(glyph).path.toSVG()).not.toThrow()
      }
    })
    const unicodeMaps = pdf.context
      .enumerateIndirectObjects()
      .flatMap(([, object]) =>
        object instanceof PDFRawStream
          ? [Buffer.from(decodePDFRawStream(object).decode()).toString("utf8")]
          : [],
      )
      .filter((stream) => stream.includes("begincmap"))
      .join("\n")
    // ToUnicode mappings preserve searchable/copyable text, including a joined emoji.
    expect(unicodeMaps).toContain("<65E5>")
    expect(unicodeMaps).toContain("<672C>")
    expect(unicodeMaps).toContain("<D83DDE80>")
    expect(unicodeMaps).toContain("<D83DDC69D83CDFFD200DD83DDCBB>")
    expect(pdf.getPageCount()).toBe(1)
  })

  it("wraps emoji sequences and combining marks as complete graphemes", () => {
    expect(pdfGraphemes("A👩🏽‍💻❤️e\u0301")).toEqual(["A", "👩🏽‍💻", "❤️", "e\u0301"])
  })

  it("rejects unsupported characters instead of silently replacing their glyphs", async () => {
    await expect(
      renderPdf({ ...model, title: "Unknown \u{10FFFF}" }, 1_800_000_000),
    ).rejects.toThrow("Statement fonts do not support U+10FFFF")
  })
})
