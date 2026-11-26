import { toMlaPdfFileName } from "./mlaPdfFileName"

it("names a PDF after the MLA and its version, safe for any file system", () => {
  expect(toMlaPdfFileName("Lemon Ltd MLA", "3")).toBe("Lemon Ltd MLA 3.pdf")
  expect(toMlaPdfFileName('A/B\\C: "D"?', "v1")).toBe("A-B-C- -D- v1.pdf")
  expect(toMlaPdfFileName("  ", undefined)).toBe("MLA.pdf")
})
