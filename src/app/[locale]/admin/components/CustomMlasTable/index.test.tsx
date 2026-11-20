/* eslint-disable import/no-extraneous-dependencies */
import { fireEvent, render, screen } from "@testing-library/react"

import { CustomMlaTemplateForAdminView } from "@/app/api/mla/interface"

import { CustomMlasTable } from "."

const retire = jest.fn()
let mockTemplates: CustomMlaTemplateForAdminView[] = []
const templates: CustomMlaTemplateForAdminView[] = [
  {
    id: 3,
    isTestnet: true,
    name: "Active MLA",
    version: "2",
    borrowerId: "11111111-1111-4111-8111-111111111111",
    borrowerName: "Test Borrower",
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
jest.mock("../../hooks/useCustomMlaTemplates", () => ({
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
