/** @jest-environment node */

import ExcelJS from "exceljs"
import { PDFDict, PDFDocument, PDFName } from "pdf-lib"

import { renderPdf, renderXlsx, StatementModel } from "./render"
import { MarketDataset } from "../types"

const model: StatementModel = {
  title: "Market condition statement",
  metadata: [["Market", "Café Finance"]],
  lead: "Deposits: 123.45 USDC · Résumé · €100",
  sections: [
    {
      title: "Activity",
      blocks: [
        { type: "paragraph", text: "Deposit confirmed. ".repeat(40) },
        {
          type: "table",
          headers: ["Token", "Amount"],
          rows: [["LongMarketName".repeat(30), "1.000000 USDC"]],
        },
      ],
    },
  ],
  definitions: [["USDC", "Asset symbol"]],
}

describe("PDF statement fonts", () => {
  it("renders compact deterministic statements using only standard PDF fonts", async () => {
    const first = await renderPdf(model, 1_800_000_000)
    expect(first).toEqual(await renderPdf(model, 1_800_000_000))
    expect(first.byteLength).toBeLessThan(25_000)
    const pdf = await PDFDocument.load(first)
    const fonts = pdf.context
      .enumerateIndirectObjects()
      .map(([, object]) => object)
      .filter(
        (object): object is PDFDict =>
          object instanceof PDFDict &&
          object.get(PDFName.of("Type")) === PDFName.of("Font"),
      )
    expect(fonts.map((font) => font.get(PDFName.of("BaseFont")))).toEqual([
      PDFName.of("Helvetica"),
      PDFName.of("Helvetica-Bold"),
    ])
    fonts.forEach((font) => {
      expect(font.get(PDFName.of("Subtype"))).toBe(PDFName.of("Type1"))
      expect(font.has(PDFName.of("FontDescriptor"))).toBe(false)
    })
    expect(pdf.getPageCount()).toBe(1)
  })

  it.each(["日本市場", "Market 🚀", "Ж"])(
    "directs unsupported text %s to XLSX or CSV instead of replacing it",
    async (title) => {
      await expect(
        renderPdf({ ...model, title }, 1_800_000_000),
      ).rejects.toThrow(
        "PDF statements support Western European characters only. Choose XLSX or CSV-only export for names containing other scripts or emoji.",
      )
    },
  )

  it("preserves Unicode names in XLSX statements", async () => {
    const title = "日本市場 🚀"
    const bytes = await renderXlsx({ ...model, title }, {
      snapshotTimestamp: 1_800_000_000,
    } as MarketDataset)
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(bytes)
    expect(workbook.worksheets[0].getCell("A1").value).toBe(title)
  })
})
