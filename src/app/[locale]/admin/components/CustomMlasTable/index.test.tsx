/* eslint-disable import/no-extraneous-dependencies */
import { fireEvent, render, screen, within } from "@testing-library/react"

import { CustomMlaTemplateForAdminView } from "@/app/api/mla/interface"
import { timestampToDateFormatted } from "@/utils/formatters"

import { CustomMlasTable } from "."

const retire = jest.fn()
const download = jest.fn()
let mockTemplates: CustomMlaTemplateForAdminView[] = []
const templates: CustomMlaTemplateForAdminView[] = [
  {
    id: 3,
    isTestnet: true,
    name: "Active MLA",
    version: "2",
    borrowerId: "11111111-1111-4111-8111-111111111111",
    borrowerName: "Test Borrower",
    createdAt: new Date("2026-11-20T09:30:00Z"),
    marketCount: 0,
  },
  {
    id: 2,
    isTestnet: true,
    name: "Old MLA",
    version: "1",
    borrowerId: "11111111-1111-4111-8111-111111111111",
    borrowerName: "Test Borrower",
    retiredAt: new Date("2026-11-01T00:00:00Z"),
    createdAt: new Date("2026-10-02T14:00:00Z"),
    marketCount: 4,
  },
]

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("@/components/TxModalComponents/TxModalHeader", () => ({
  TxModalHeader: () => null,
}))
jest.mock("../RegisterCustomMlaModal", () => ({
  RegisterCustomMlaModal: () => null,
}))
jest.mock("@/app/[locale]/borrower/hooks/mla/useGetMlaTemplate", () => ({
  useGetMlaTemplate: (id: number) => ({
    data: {
      id,
      html: "<p>Rate {{market.apr}}</p>",
      borrowerFields: [{ source: "market.apr", placeholder: "APR" }],
      lenderFields: [],
    },
    isLoading: false,
  }),
}))
jest.mock("../../hooks/useCustomMlaTemplates", () => ({
  useDownloadMlaPdf: () => ({ mutate: download, isPending: false }),
  useCustomMlaTemplates: () => ({ data: mockTemplates, isLoading: false }),
  useRetireMlaTemplate: () => ({
    mutate: retire,
    isPending: false,
    error: null,
  }),
}))

it("shows a readable empty state instead of an empty grid", () => {
  mockTemplates = []
  render(<CustomMlasTable />)
  screen.getByText("admin.customMla.empty")
  expect(screen.queryByRole("grid")).toBeNull()
})

it("lists the newest first, with the date each was added", () => {
  mockTemplates = [...templates].reverse()
  render(<CustomMlasTable />)
  const names = screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("gridcell")[1].textContent)
  expect(names).toEqual(["Active MLA", "Old MLA"])
  screen.getByText(
    timestampToDateFormatted(+new Date("2026-10-02T14:00:00Z") / 1000),
  )
})

it("lists custom MLAs and retires only active ones", () => {
  mockTemplates = templates
  render(<CustomMlasTable />)
  screen.getByText("Active MLA")
  screen.getByText("Old MLA")
  const retireButtons = screen.getAllByText("admin.customMla.retire")
  expect(retireButtons).toHaveLength(1)

  fireEvent.click(retireButtons[0])
  fireEvent.click(screen.getAllByText("admin.customMla.retire")[1])
  expect(retire).toHaveBeenCalledWith(3, expect.anything())
})

it("views and downloads any custom MLA, retired ones too", () => {
  mockTemplates = templates
  render(<CustomMlasTable />)
  expect(screen.getAllByText("admin.customMla.view")).toHaveLength(2)

  fireEvent.click(screen.getAllByText("admin.customMla.download")[1])
  expect(download).toHaveBeenCalledWith({
    templateId: 2,
    fileName: "Old MLA 1.pdf",
  })
  expect(screen.queryByTitle("admin.customMla.preview")).toBeNull()

  fireEvent.click(screen.getAllByText("admin.customMla.view")[0])
  expect(
    screen.getByTitle("admin.customMla.preview").getAttribute("srcdoc"),
  ).toBe("<p>Rate [APR]</p>")
  fireEvent.click(screen.getByText("admin.customMla.downloadPdf"))
  expect(download).toHaveBeenLastCalledWith({
    html: "<p>Rate [APR]</p>",
    fileName: "Active MLA 2.pdf",
  })
})

it("views a custom MLA when its row is clicked", () => {
  mockTemplates = templates
  render(<CustomMlasTable />)
  fireEvent.click(screen.getByText("Old MLA"))
  screen.getByTitle("admin.customMla.preview")
})
