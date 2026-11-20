import { TFunction } from "i18next"

import { getMlaTemplateLabel, getMlaTemplateOptions } from "./mlaTemplateLabel"

const t = ((key: string, values?: { name?: string; version?: string }) =>
  key === "mla.customMla"
    ? `${values?.name} (${values?.version})`
    : key) as unknown as TFunction

it("names a market MLA by its own name and a custom MLA with its version", () => {
  expect(
    getMlaTemplateLabel(t, { name: "Wildcat MLA 2024", isCustom: false }),
  ).toBe("Wildcat MLA 2024")
  expect(
    getMlaTemplateLabel(t, {
      name: "Stormwind MLA",
      version: "2",
      isCustom: true,
    }),
  ).toBe("Stormwind MLA (2)")
})

it("offers visible templates only, each under a label that tells them apart", () => {
  expect(
    getMlaTemplateOptions(t, [
      { id: 1, name: "Wildcat MLA 2024" },
      { id: 2, name: "Wildcat MLA 2025" },
      { id: 3, name: "Wildcat MLA 2024", hide: true },
      { id: 7, name: "Stormwind MLA", version: "2", borrowerId: "org" },
    ]),
  ).toEqual([
    { id: 1, label: "Wildcat MLA 2024" },
    { id: 2, label: "Wildcat MLA 2025" },
    { id: 7, label: "Stormwind MLA (2)" },
  ])
  expect(getMlaTemplateOptions(t, undefined)).toEqual([])
})
